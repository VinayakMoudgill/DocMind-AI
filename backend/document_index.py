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


def _ensure_ml_path() -> None:
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    ml_dir = str(root / "ml-pipeline")
    if ml_dir not in sys.path:
        sys.path.insert(0, ml_dir)


def chunk_text(
    text: str,
    chunk_size: int = 120,
    chunk_overlap: int = 30,
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
    if ext in ("docx", "mp4"):
        return (
            f"[{ext.upper()}] File uploaded: {filename}. "
            "Full parsing requires LlamaParse / media pipeline (not enabled in lightweight demo)."
        )
    return raw.decode("utf-8", errors="replace")


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

    def add_file(self, filename: str, raw: bytes, chunk_size: int = 120) -> StoredDocument:
        from backend.config import settings

        text = extract_text_from_bytes(filename, raw).strip()
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
        self._rebuild_search_index()
        self._rag = None
        logger.info("Indexed %s: %s chunks", filename, len(chunks))
        return doc

    def all_chunks(self) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for d in self.documents.values():
            out.extend(d.chunks)
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

    def _rebuild_search_index(self) -> None:
        self._search_engine = None
        self.get_search_engine()

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
