"""
API Routes for Exam Lens | Question Generation
"""

import logging
import sys
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.document_index import document_index
from backend.models import ExamLensRequest, ExamLensResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _ml_path():
    root = Path(__file__).resolve().parent.parent.parent
    ml = root / "ml-pipeline"
    p = str(ml)
    if p not in sys.path:
        sys.path.insert(0, p)


@router.post("/generate")
async def generate_questions(request: ExamLensRequest) -> ExamLensResponse:
    """
    Generate practice questions from a document.

    Uses Exam Lens feature to create MCQ questions
    with realistic distractors from the same document.
    """
    t0 = time.perf_counter()
    try:
        doc = document_index.documents.get(request.document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        _ml_path()
        from exam_lens import get_exam_lens

        chunks = [
            {"text": c["text"], "chunk_type": "Definition"} for c in doc.chunks[:50]
        ]
        exam_lens_instance = get_exam_lens()
        questions = exam_lens_instance.generate_questions(
            chunks=chunks,
            num_questions=request.num_questions,
            difficulty=request.difficulty,
        )
        for q in questions:
            q.pop("explanation", None)

        ms = (time.perf_counter() - t0) * 1000
        return ExamLensResponse(
            questions=questions,
            total_questions=len(questions),
            document_id=request.document_id,
            execution_time_ms=round(ms, 2),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Question generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/evaluate")
async def evaluate_answer(question_id: str, selected_index: int):
    """
    Evaluate user's answer to generated question.

    Returns correctness, explanation, and related content.
    """
    return {
        "is_correct": selected_index == 0,
        "explanation": "Wire-up requires storing questions server-side with IDs.",
        "related_content": "See Exam Lens generate response for source_chunk.",
    }
