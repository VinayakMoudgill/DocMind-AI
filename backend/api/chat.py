"""
API Routes for Chat | Query and Conversation Management
"""

import logging
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, WebSocket

from backend.document_index import document_index
from backend.models import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest) -> ChatResponse:
    """
    Submit a query to chat with documents.

    Returns answer with source citations and confidence score.
    """
    t0 = time.perf_counter()
    try:
        logger.info("Chat query: %s", request.message)

        if not document_index.all_chunks():
            raise HTTPException(
                status_code=400,
                detail="No documents indexed. Upload files before querying.",
            )

        rag = document_index.get_rag_pipeline()
        raw = await rag.query(
            user_query=request.message,
            document_ids=request.document_ids or None,
            k=5,
            validate_with_nli=request.use_nli_validation,
        )

        ms = (time.perf_counter() - t0) * 1000

        if raw.get("error"):
            raise HTTPException(status_code=500, detail=raw["error"])

        return ChatResponse(
            answer=raw["answer"],
            source_map=raw.get("source_map", []),
            confidence_score=float(raw.get("confidence_score", 0.0)),
            nli_scores=raw.get(
                "nli_scores",
                {"entailment": 0.0, "neutral": 0.0, "contradiction": 0.0},
            ),
            conversation_id=request.conversation_id,
            message_id=str(uuid.uuid4()),
            execution_time_ms=round(ms, 2),
            confidence_explanation=raw.get("confidence_explanation"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Chat query failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """
    WebSocket endpoint for streaming chat responses.
    """
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
            await websocket.send_json(
                {
                    "type": "response",
                    "content": "Streaming is not implemented; use POST /api/chat/query.",
                    "done": True,
                }
            )
    except Exception as e:
        logger.error("WebSocket error: %s", e)
        await websocket.close(code=1000)


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Fetch conversation history"""
    return {
        "id": conversation_id,
        "workspace_id": "workspace-1",
        "title": "DBMS Questions",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "message_count": 0,
    }


@router.post("/conversations")
async def create_conversation():
    """Create new conversation"""
    conv_id = str(uuid.uuid4())
    return {
        "id": conv_id,
        "workspace_id": "workspace-1",
        "title": "New Conversation",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "message_count": 0,
    }
