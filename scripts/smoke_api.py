"""Quick API smoke test (no server required). Run: PYTHONPATH=<repo> python scripts/smoke_api.py"""

import os

os.environ.setdefault("DOCMIND_SKIP_NLI", "1")

from fastapi.testclient import TestClient

from backend.document_index import document_index
from backend.main import app


def main() -> None:
    document_index.clear()
    c = TestClient(app)
    ok_all = True

    def check(name: str, cond: bool, detail: str = "") -> None:
        nonlocal ok_all
        status = "OK" if cond else "FAIL"
        if not cond:
            ok_all = False
        extra = f" — {detail}" if detail else ""
        print(f"  [{status}] {name}{extra}")

    r = c.get("/health")
    check("GET /health", r.status_code == 200)

    r = c.post(
        "/api/documents/upload",
        files={"files": ("api_test.txt", b"Revenue 100. Date 2026-01-01.", "text/plain")},
    )
    check("POST /api/documents/upload", r.status_code == 200, r.text[:160] if r.status_code != 200 else "")
    doc_id = None
    if r.status_code == 200:
        doc_id = r.json().get("document_ids", [None])[0]

    r = c.post(
        "/api/chat/query",
        json={
            "message": "What is mentioned?",
            "conversation_id": "test-1",
            "document_ids": [],
            "use_nli_validation": True,
        },
    )
    check("POST /api/chat/query", r.status_code == 200, r.text[:200] if r.status_code != 200 else "")

    if doc_id:
        r = c.post(
            "/api/exam-lens/generate",
            json={"document_id": doc_id, "num_questions": 1, "difficulty": "easy"},
        )
        check(
            "POST /api/exam-lens/generate",
            r.status_code == 200,
            f"HTTP {r.status_code} {r.text[:120]}",
        )

        r2 = c.post(
            "/api/documents/upload",
            files={"files": ("b.txt", b"Date of Incident: 2026-03-12", "text/plain")},
        )
        ids = [doc_id]
        if r2.status_code == 200:
            ids.extend(r2.json().get("document_ids", []))
        r = c.post(
            "/api/disagreement-detector/analyze",
            json={"document_ids": ids, "min_conflicts": 1},
        )
        check("POST /api/disagreement-detector/analyze", r.status_code == 200, r.text[:120])

    r = c.get("/openapi.json")
    check("GET /openapi.json (docs schema)", r.status_code == 200)

    print("")
    print("Result:", "ALL CHECKS PASSED" if ok_all else "SOME CHECKS FAILED")


if __name__ == "__main__":
    main()
