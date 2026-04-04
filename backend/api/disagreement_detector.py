"""
API Routes for Disagreement Detector | Cross-Document Analysis
"""

import logging
import sys
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.document_index import document_index
from backend.models import DisagreementDetectorRequest, DisagreementDetectorResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _ml_path():
    root = Path(__file__).resolve().parent.parent.parent
    ml = root / "ml-pipeline"
    p = str(ml)
    if p not in sys.path:
        sys.path.insert(0, p)


@router.post("/analyze")
async def analyze_disagreements(
    request: DisagreementDetectorRequest,
) -> DisagreementDetectorResponse:
    """
    Analyze multiple documents for conflicting entity values.

    Identifies inconsistencies in dates, amounts, names, etc.
    across documents.
    """
    t0 = time.perf_counter()
    try:
        _ml_path()
        from disagreement_detector import get_disagreement_detector

        ids = request.document_ids or list(document_index.documents.keys())
        if len(ids) < 1:
            raise HTTPException(
                status_code=400,
                detail="No documents to analyze. Upload files or pass document_ids.",
            )

        docs = []
        for did in ids:
            d = document_index.documents.get(did)
            if d:
                docs.append(
                    {
                        "id": d.id,
                        "filename": d.filename,
                        "text": d.full_text,
                    }
                )

        if len(docs) < 1:
            raise HTTPException(status_code=404, detail="No matching documents in index")

        detector = get_disagreement_detector()
        raw_conflicts = detector.analyze_conflicts(
            docs,
            min_conflicts=request.min_conflicts,
        )

        conflicts_out = []
        for c in raw_conflicts:
            occs = []
            for o in c.get("occurrences", []):
                occs.append(
                    {
                        "document_id": o.get("document_id", ""),
                        "filename": o.get("filename", ""),
                        "page": o.get("page"),
                        "value": o.get("value", o.get("raw_value", "")),
                        "normalized_value": o.get(
                            "normalized_value",
                            o.get("value", ""),
                        ),
                    }
                )
            conflicts_out.append(
                {
                    "entity_name": c.get("entity_name", "unknown"),
                    "entity_type": str(c.get("entity_type", "other")),
                    "occurrences": occs,
                    "confidence": float(c.get("confidence", 0)),
                }
            )

        ms = (time.perf_counter() - t0) * 1000
        return DisagreementDetectorResponse(
            conflicts=conflicts_out,
            total_conflicts=len(conflicts_out),
            documents_analyzed=len(docs),
            execution_time_ms=round(ms, 2),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Disagreement analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
