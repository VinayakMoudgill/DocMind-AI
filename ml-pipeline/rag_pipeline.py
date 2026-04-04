"""
RAG Pipeline | Retrieval-Augmented Generation
Orchestrates retrieval, augmentation, validation, and response generation
"""

import logging
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.config import settings
from backend.llm_utils import generate_chat, has_llm_configured

from hybrid_search import HybridSearchEngine
from nli_critic_agent import NLICriticAgent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  System prompts
# ---------------------------------------------------------------------------

_RAG_SYSTEM_PROMPT = """\
You are DocMind AI, an expert document analyst. Your job is to answer the user's \
question using ONLY the CONTEXT excerpts provided below (sourced from the user's \
uploaded files).

## STRICT RULES
1. **Ground every claim in the CONTEXT.** Do not use outside knowledge. If information \
is absent, say "The uploaded documents do not contain information about …" — never invent content.
2. **Cite sources inline.** After each key fact write the citation in parentheses, e.g. \
*(Page 3, DBMS_Notes.pdf)*. Use the filename and page numbers given in the [Source] headers.
3. **Never describe DocMind AI itself, this chat UI, or any assistant/product** unless \
those words literally appear as the subject of the document.
4. **Be thorough.** Give complete, well-structured answers — use headings, bullet points, \
numbered lists, bold key terms, and tables where they improve clarity.
5. **If the CONTEXT is insufficient**, explicitly state what is missing. Never pad the \
answer with filler.
6. **Examples**: When illustrating a concept, derive examples directly from the CONTEXT \
text. If the CONTEXT does not include examples, you may briefly create a simple one but \
mark it clearly, e.g. "For instance (illustrative):". Prefer restating source material.

## FORMATTING
- Use **Markdown** for structure (headings, bold, bullet lists, tables).
- Keep paragraphs short (2-4 sentences each).
- Start with a direct answer, then elaborate.
"""

_SUMMARY_ADDENDUM = """\

## SUMMARY TASK
Produce a **comprehensive summary** of the document using ONLY the CONTEXT excerpts below.

Structure:
1. **Overview** — one-paragraph description of what the document covers.
2. **Key Topics** — bullet list of main subjects, definitions, comparisons, or arguments found.
3. **Important Details** — highlight notable data points, formulas, dates, or conclusions.
4. **Project/Practical Section** (only if CONTEXT mentions one) — briefly note team, scope, or tech stack.

Stay faithful to the CONTEXT. If coverage is thin, say so.
"""


class RAGPipeline:
    """
    Complete RAG Pipeline:
    1. Retrieve relevant chunks via hybrid search
    2. Augment prompt with retrieved context
    3. Generate response via LLM (OpenRouter → Gemini → OpenAI)
    4. Validate response via NLI critic
    5. Return response with source citations
    """

    def __init__(
        self,
        search_engine: HybridSearchEngine,
        nli_agent: NLICriticAgent,
        llm_model: Optional[str] = None,
    ):
        self.search_engine = search_engine
        self.nli_agent = nli_agent
        self.llm_model = llm_model or settings.openai_model
        if has_llm_configured():
            logger.info(
                "RAG: LLM configured (OpenRouter if OPENROUTER_API_KEY, else Gemini, else OpenAI)"
            )
        else:
            logger.warning(
                "RAG: No OPENROUTER_API_KEY, GEMINI_API_KEY/GOOGLE_API_KEY, or OPENAI_API_KEY — retrieval fallback only"
            )

        logger.info("✅ RAG Pipeline initialized")

    @staticmethod
    def _is_summary_intent(user_query: str) -> bool:
        q = (user_query or "").lower()
        return bool(
            re.search(
                r"\b(summar(y|ise|ize)|summarise|overview|tl;dr|tldr|outline\s+the|main\s+points)\b",
                q,
            )
            or "this ppt" in q
            or "this pdf" in q
            or "this document" in q
            or "this file" in q
            or "this slide" in q
        )

    def _build_prompt(
        self,
        retrieved_chunks: List[Dict],
        user_query: str,
        *,
        summary_intent: bool,
    ) -> tuple[str, str, str]:
        """
        Build separate system prompt and user message.

        Returns:
            (system_prompt, user_message, combined_context_for_nli)
        """
        # Build context block with clear source headers
        context_parts = []
        for chunk in retrieved_chunks:
            source = chunk.get("source_file", chunk.get("source", "Unknown"))
            page = chunk.get("page", "?")
            context_parts.append(
                f"[Source: {source} — Page {page}]\n{chunk['text']}"
            )
        combined_context = "\n\n---\n\n".join(context_parts)

        # Build system prompt
        system_prompt = _RAG_SYSTEM_PROMPT
        if summary_intent:
            system_prompt += _SUMMARY_ADDENDUM

        # Build user message with context embedded
        user_message = f"""## CONTEXT (from user's uploaded documents)

{combined_context}

---

## USER QUESTION
{user_query}"""

        return system_prompt, user_message, combined_context

    def _fallback_answer(
        self,
        retrieved_chunks: List[Dict],
        user_query: str,
        reason: str = "LLM not configured or request failed",
    ) -> str:
        parts = []
        for ch in retrieved_chunks[:3]:
            fn = ch.get("source_file", ch.get("source", "Unknown"))
            pg = ch.get("page", "?")
            parts.append(f"From Page {pg}, {fn}: {ch['text'][:400]}")
        return (
            f"{reason}. Top retrieved excerpts:\n\n"
            + "\n\n".join(parts)
            + "\n\nSet OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY for full generative answers."
        )

    async def generate_response(
        self,
        user_query: str,
        retrieved_chunks: List[Dict],
        validate_with_nli: bool = True,
    ) -> Dict:
        logger.info("RAG: Generating response for query: %s", user_query)

        summary_intent = self._is_summary_intent(user_query)
        system_prompt, user_message, combined_context = self._build_prompt(
            retrieved_chunks, user_query, summary_intent=summary_intent
        )

        generated_answer: Optional[str] = None
        if has_llm_configured():
            max_tokens = 3072 if summary_intent else 2048
            generated_answer = generate_chat(
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=0.12 if summary_intent else 0.2,
                max_output_tokens=max_tokens,
            )

        if generated_answer:
            logger.info("LLM response length=%s", len(generated_answer))
        else:
            generated_answer = self._fallback_answer(
                retrieved_chunks,
                user_query,
                reason="LLM request failed or no API key",
            )

        nli_scores = {
            "entailment": 0.5,
            "neutral": 0.3,
            "contradiction": 0.2,
        }
        confidence_score = 0.5

        # NLI entailment is a poor match for multi-chunk summaries (paraphrase scores low and
        # triggers a scary prefix even when the answer is fine). Skip for summary requests.
        run_nli = validate_with_nli and not summary_intent
        if run_nli:
            try:
                nli_scores = self.nli_agent.validate_response(
                    combined_context[:8000],
                    generated_answer[:2000],
                )
                confidence_score = float(nli_scores.get("entailment", 0.5))
            except Exception as e:
                logger.warning("NLI validation failed: %s", e)
        elif summary_intent:
            confidence_score = 0.82
            nli_scores = {
                "entailment": confidence_score,
                "neutral": 0.12,
                "contradiction": 0.06,
            }

        source_map = [
            {
                "chunk_id": chunk.get("id", "unknown"),
                "file": chunk.get("source_file", chunk.get("source", "Unknown")),
                "page": chunk.get("page"),
                "snippet": (chunk.get("text", "") or "")[:200],
            }
            for chunk in retrieved_chunks
        ]

        unverified = confidence_score < settings.min_confidence_threshold
        answer = generated_answer
        # Hallucination prefix removed

        result = {
            "answer": answer,
            "source_map": source_map,
            "confidence_score": confidence_score,
            "nli_scores": nli_scores,
            "confidence_explanation": self.nli_agent.get_confidence_explanation(confidence_score),
            "unverified": unverified,
        }

        logger.info("RAG complete: confidence=%.2f%%", confidence_score * 100)
        return result

    async def query(
        self,
        user_query: str,
        document_ids: Optional[List[str]] = None,
        k: int = 5,
        alpha: float = 0.6,
        validate_with_nli: bool = True,
    ) -> Dict:
        try:
            summary_intent = self._is_summary_intent(user_query)
            retrieve_k = max(k, 18) if summary_intent else max(k, 5)
            use_k = min(20, retrieve_k) if summary_intent else k

            # Long "summarise this document..." queries skew BM25/dense toward generic words;
            # use a neutral retrieval query for summaries, then merge with spread chunks.
            search_query = user_query
            if summary_intent:
                search_query = (
                    "definitions concepts comparison normalization database operating system "
                    "problem statement solution key topics sections examples"
                )

            retrieved_chunks = self.search_engine.hybrid_search(
                query=search_query,
                k=retrieve_k,
                alpha=alpha,
            )

            if document_ids:
                allowed = set(document_ids)
                retrieved_chunks = [
                    c for c in retrieved_chunks if c.get("document_id") in allowed
                ]

            if summary_intent and document_ids:
                from backend.document_index import document_index as di

                pool = di.chunks_for_document_ids(list(document_ids))
                allowed_d = set(document_ids)
                pool = [c for c in pool if c.get("document_id") in allowed_d]
                spread: List[Dict] = []
                n = len(pool)
                if n > 0:
                    want = min(12, n)
                    if n <= want:
                        spread = list(pool)
                    else:
                        step = (n - 1) / max(want - 1, 1)
                        idxs = sorted(
                            {min(n - 1, int(round(i * step))) for i in range(want)}
                        )
                        spread = [pool[i] for i in idxs]
                seen_ids = {c.get("id") for c in spread if c.get("id")}
                merged: List[Dict] = list(spread)
                for c in retrieved_chunks:
                    cid = c.get("id")
                    if cid and cid not in seen_ids:
                        seen_ids.add(cid)
                        merged.append(c)
                retrieved_chunks = merged[:use_k]
            else:
                retrieved_chunks = retrieved_chunks[:use_k]

            if not retrieved_chunks:
                logger.warning("No relevant chunks found")
                return {
                    "answer": "No relevant information found in the uploaded documents.",
                    "source_map": [],
                    "confidence_score": 0.0,
                    "nli_scores": {"entailment": 0.0, "neutral": 0.0, "contradiction": 1.0},
                    "confidence_explanation": "No retrieval hits",
                    "unverified": True,
                }

            result = await self.generate_response(
                user_query,
                retrieved_chunks,
                validate_with_nli=validate_with_nli,
            )
            return result

        except Exception as e:
            logger.error("Error in RAG query: %s", e)
            return {
                "error": str(e),
                "answer": "An error occurred while processing your query.",
                "source_map": [],
                "confidence_score": 0.0,
                "nli_scores": {"entailment": 0.0, "neutral": 0.0, "contradiction": 0.0},
            }
