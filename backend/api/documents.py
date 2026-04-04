"""
API Routes for Documents | Upload and Management
"""

import logging
import time
from datetime import datetime
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.document_index import document_index

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload documents for ingestion and indexing.

    Supported formats: PDF, DOCX, MP4, CSV, TXT (PDF/TXT/CSV fully parsed in demo build).
    """
    t0 = time.perf_counter()
    try:
        document_ids: List[str] = []
        total_chunks = 0

        for file in files:
            if not file.filename:
                continue
            file_ext = file.filename.rsplit(".", 1)[-1].lower()
            valid_exts = {"pdf", "docx", "mp4", "csv", "txt"}
            if file_ext not in valid_exts:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type .{file_ext} not supported",
                )

            raw = await file.read()
            doc = await document_index.add_file(file.filename, raw)
            document_ids.append(doc.id)
            total_chunks += len(doc.chunks)
            logger.info("Stored %s as %s", file.filename, doc.id)

        ms = (time.perf_counter() - t0) * 1000
        summaries = document_index.list_document_summaries()
        id_to = {s["id"]: s for s in summaries}
        documents_out = [id_to[i] for i in document_ids if i in id_to]
        return {
            "status": "success",
            "document_ids": document_ids,
            "documents": documents_out,
            "chunks_ingested": total_chunks,
            "indexing_time_ms": round(ms, 2),
            "message": f"Successfully uploaded {len(document_ids)} documents",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Upload failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/list")
async def list_documents():
    """List indexed documents (demo index)."""
    return {"documents": document_index.list_document_summaries()}


@router.get("/{document_id}")
async def get_document_metadata(document_id: str):
    """Retrieve document metadata"""
    doc = document_index.documents.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "filename": doc.filename,
        "chunks_count": len(doc.chunks),
        "created_at": datetime.now().isoformat(),
        "status": "ready",
    }


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete document and associated chunks"""
    if document_id not in document_index.documents:
        raise HTTPException(status_code=404, detail="Document not found")
    del document_index.documents[document_id]
    document_index._search_engine = None
    document_index._rag = None
    document_index.get_search_engine()
    return {"status": "success", "message": f"Document {document_id} deleted"}
