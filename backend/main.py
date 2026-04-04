"""
DocMind AI Backend | FastAPI Application
Main entry point for the document intelligence system
"""

from fastapi import FastAPI, WebSocket, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from contextlib import asynccontextmanager
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routers (run with PYTHONPATH=<repo-root>, e.g. `uvicorn backend.main:app`)
from backend.api.documents import router as documents_router
from backend.api.chat import router as chat_router
from backend.api.exam_lens import router as exam_lens_router
from backend.api.disagreement_detector import router as disagreement_detector_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 DocMind AI Backend Starting...")
    # Initialize Supabase, Redis, load models
    yield
    logger.info("🛑 DocMind AI Backend Shutting Down...")

app = FastAPI(
    title="DocMind AI API",
    description="Trustworthy Document Intelligence System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/health")
async def health_check():
    """Verify API is running"""
    return {
        "status": "healthy",
        "service": "DocMind AI Backend",
        "version": "1.0.0"
    }

# Register routers
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(exam_lens_router, prefix="/api/exam-lens", tags=["exam-lens"])
app.include_router(disagreement_detector_router, prefix="/api/disagreement-detector", tags=["disagreement-detector"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
