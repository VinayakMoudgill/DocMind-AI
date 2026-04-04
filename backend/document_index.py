"""
In-memory document index for hybrid search + RAG (demo / local dev).
Rebuilt on each upload batch; production would use Supabase + pgvector.
"""

from __future__ import annotations

import logging
import re
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


import asyncio
from concurrent.futures import ThreadPoolExecutor

_thread_pool = ThreadPoolExecutor(max_workers=2)


def _ensure_ml_path() -> None:
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    ml_dir = str(root / "ml-pipeline")
    if ml_dir not in sys.path:
        sys.path.insert(0, ml_dir)


def chunk_text(
    text: str,
    chunk_size: int = 256,
    chunk_overlap: int = 64,
) -> List[str]:
    """Word-based chunks for BM25 + dense retrieval."""
    words = text.split()
    if not words:
        return []
    chunks: List[str] = []
    step = max(1, chunk_size - chunk_overlap)
    for i in range(0, len(words), step):
        piece = words[i : i + chunk_size]
        if piece:
            chunks.append(" ".join(piece))
    return chunks


def extract_text_from_bytes(filename: str, raw: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "txt" or ext == "csv":
        return raw.decode("utf-8", errors="replace")
    if ext == "pdf":
        try:
            from pypdf import PdfReader
            from io import BytesIO

            reader = PdfReader(BytesIO(raw))
            parts: List[str] = []
            for page in reader.pages:
                t = page.extract_text() or ""
                if t.strip():
                    parts.append(t)
            return "\n\n".join(parts) if parts else ""
        except Exception as e:
            logger.warning("PDF extract failed for %s: %s", filename, e)
            return ""
    if ext == "mp4":
        try:
            return _transcribe_mp4(raw, filename)
        except Exception as e:
            logger.warning("MP4 transcription failed for %s: %s", filename, e)
            return f"[MP4] File uploaded: {filename}. Transcription failed: {e}"
    if ext == "docx":
        return (
            f"[DOCX] File uploaded: {filename}. "
            "Full parsing requires LlamaParse (not enabled in lightweight demo)."
        )
    return raw.decode("utf-8", errors="replace")


def _transcribe_mp4(raw: bytes, filename: str) -> str:
    """Extract audio from MP4 and transcribe using Whisper."""
    import tempfile
    import os
    import subprocess
    import wave
    import numpy as np

    # Get ffmpeg path from imageio_ffmpeg
    import imageio_ffmpeg
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

    logger.info("FFmpeg path: %s, exists: %s", ffmpeg_path, os.path.exists(ffmpeg_path))

    # Write video bytes to temp file
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_video:
        tmp_video.write(raw)
        tmp_video_path = tmp_video.name

    logger.info("Video temp file: %s, size: %s", tmp_video_path, os.path.getsize(tmp_video_path))

    # Create temp audio file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_audio:
        tmp_audio_path = tmp_audio.name

    try:
        # Extract audio using ffmpeg directly via subprocess
        cmd = [
            ffmpeg_path,
            "-i", tmp_video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-y",
            tmp_audio_path
        ]

        logger.info("Running ffmpeg command...")

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        logger.info("FFmpeg return code: %s", result.returncode)

        if result.returncode != 0:
            logger.error("FFmpeg stderr: %s", result.stderr)
            return f"[MP4] File uploaded: {filename}. Audio extraction failed: {result.stderr[:200]}"

        logger.info("Audio extracted successfully to: %s", tmp_audio_path)

        # Load audio file manually to bypass Whisper's ffmpeg call
        with wave.open(tmp_audio_path, 'rb') as wav_file:
            n_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            n_frames = wav_file.getnframes()

            raw_audio = wav_file.readframes(n_frames)
            # Convert to numpy array (16-bit PCM)
            audio_data = np.frombuffer(raw_audio, dtype=np.int16).astype(np.float32) / 32768.0

            # If stereo, convert to mono
            if n_channels == 2:
                audio_data = audio_data.reshape(-1, 2).mean(axis=1)

            # Resample if needed (using simple method)
            if framerate != 16000:
                # Simple downsampling
                factor = framerate / 16000
                indices = np.arange(0, len(audio_data), factor).astype(int)
                indices = indices[indices < len(audio_data)]
                audio_data = audio_data[indices]

        logger.info("Audio loaded: shape=%s, dtype=%s", audio_data.shape, audio_data.dtype)

        # Transcribe with Whisper using numpy array
        import whisper

        logger.info("Loading Whisper model...")
        model = whisper.load_model("base")

        logger.info("Transcribing...")
        transcription = model.transcribe(audio_data, fp16=False)

        transcript = transcription.get("text", "").strip()
        logger.info("Transcript length: %s", len(transcript))

        if transcript:
            return f"[MP4 Transcription: {filename}]\n\n{transcript}"
        else:
            return f"[MP4] File uploaded: {filename}. No speech detected."

    except Exception as e:
        logger.exception("MP4 transcription error:")
        return f"[MP4] File uploaded: {filename}. Transcription failed: {type(e).__name__}: {e}"
    finally:
        # Cleanup
        if os.path.exists(tmp_video_path):
            os.unlink(tmp_video_path)
        if os.path.exists(tmp_audio_path):
            os.unlink(tmp_audio_path)


@dataclass
class StoredDocument:
    id: str
    filename: str
    full_text: str
    chunks: List[Dict[str, Any]] = field(default_factory=list)


class DocumentIndex:
    """Singleton-style index; import `document_index` instance from this module."""

    def __init__(self) -> None:
        self.documents: Dict[str, StoredDocument] = {}
        self._search_engine = None
        self._rag = None

    def clear(self) -> None:
        self.documents.clear()
        self._search_engine = None
        self._rag = None

    async def add_file(self, filename: str, raw: bytes, chunk_size: int = 256) -> StoredDocument:
        from backend.config import settings

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        # Run extraction in thread pool for heavy operations (MP4/Whisper)
        if ext == "mp4":
            text = await asyncio.get_event_loop().run_in_executor(
                _thread_pool, extract_text_from_bytes, filename, raw
            )
        else:
            text = extract_text_from_bytes(filename, raw)

        text = text.strip()
        if not text:
            text = f"(empty) {filename}"

        doc_id = str(uuid.uuid4())
        pieces = chunk_text(text, chunk_size=chunk_size, chunk_overlap=settings.chunk_overlap // 4 or 24)
        if not pieces:
            pieces = [text[:2000]]

        chunks: List[Dict[str, Any]] = []
        for i, piece in enumerate(pieces):
            chunks.append(
                {
                    "id": f"{doc_id}-c{i}",
                    "document_id": doc_id,
                    "text": piece,
                    "source_file": filename,
                    "page": i + 1,
                    "source": filename,
                }
            )

        doc = StoredDocument(id=doc_id, filename=filename, full_text=text, chunks=chunks)
        self.documents[doc_id] = doc
        # Rebuild search index in background thread to avoid blocking
        await asyncio.get_event_loop().run_in_executor(_thread_pool, self._rebuild_search_index_sync)
        self._rag = None
        logger.info("Indexed %s: %s chunks", filename, len(chunks))
        return doc

    def all_chunks(self) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for d in self.documents.values():
            out.extend(d.chunks)
        return out

    def chunks_for_document_ids(self, document_ids: List[str]) -> List[Dict[str, Any]]:
        """All indexed chunks for the given document IDs (order: upload order, then chunk order)."""
        out: List[Dict[str, Any]] = []
        for did in document_ids:
            doc = self.documents.get(did)
            if doc:
                out.extend(doc.chunks)
        return out

    def get_search_engine(self):
        _ensure_ml_path()
        from hybrid_search import HybridSearchEngine

        chunks = self.all_chunks()
        if self._search_engine is None:
            self._search_engine = HybridSearchEngine()
        if chunks:
            self._search_engine.build_index(chunks)
        return self._search_engine

    def _rebuild_search_index_sync(self) -> None:
        """Synchronous version for thread pool execution."""
        self._search_engine = None
        self.get_search_engine()

    def _rebuild_search_index(self) -> None:
        """Deprecated: Use _rebuild_search_index_sync for thread pool."""
        self._rebuild_search_index_sync()

    def get_rag_pipeline(self):
        _ensure_ml_path()
        from nli_critic_agent import get_nli_agent
        from rag_pipeline import RAGPipeline

        if self._rag is None:
            self._rag = RAGPipeline(self.get_search_engine(), get_nli_agent())
        return self._rag

    def list_document_summaries(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": d.id,
                "name": d.filename,
                "chunks": len(d.chunks),
                "filename": d.filename,
            }
            for d in self.documents.values()
        ]


document_index = DocumentIndex()
