"""
NLI Critic Agent | Hallucination Shield
Validates generated responses against retrieved context using NLI scoring.
Uses a sentence-transformers CrossEncoder (3-way NLI) or a lexical fallback.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.config import settings

logger = logging.getLogger(__name__)


def _lexical_entailment_proxy(premise: str, hypothesis: str) -> Dict[str, float]:
    """Cheap fallback when models are skipped or unavailable."""
    p = set(premise.lower().split())
    h = set(hypothesis.lower().split())
    if not h:
        return {"contradiction": 0.33, "neutral": 0.34, "entailment": 0.33}
    overlap = len(p & h) / len(h)
    entail = min(0.95, 0.35 + 0.6 * overlap)
    neutral = max(0.05, (1.0 - entail) * 0.6)
    contra = max(0.05, 1.0 - entail - neutral)
    s = entail + neutral + contra
    return {
        "entailment": entail / s,
        "neutral": neutral / s,
        "contradiction": contra / s,
    }


class NLICriticAgent:
    """
    NLI critic: premise = retrieved context, hypothesis = model answer.
    """

    def __init__(self, model_name: Optional[str] = None):
        self._skip = os.getenv("DOCMIND_SKIP_NLI", "").lower() in ("1", "true", "yes")
        self._model = None
        self._label_to_idx: Dict[str, int] = {}
        name = model_name or os.getenv(
            "DOCMIND_NLI_MODEL",
            "cross-encoder/nli-deberta-v3-small",
        )

        if self._skip:
            logger.info("NLI critic disabled (DOCMIND_SKIP_NLI)")
            return

        try:
            from sentence_transformers import CrossEncoder

            device = None
            if settings.device == "auto":
                try:
                    import torch

                    device = "cuda" if torch.cuda.is_available() else "cpu"
                except Exception:
                    device = "cpu"
            elif settings.device == "cuda":
                try:
                    import torch

                    device = "cuda" if torch.cuda.is_available() else "cpu"
                except Exception:
                    device = "cpu"
            else:
                device = settings.device

            self._model = CrossEncoder(name, max_length=512, device=device)
            cfg = self._model.model.config
            raw = getattr(cfg, "id2label", None) or {}
            self._label_to_idx = {}
            for k, v in raw.items():
                idx = int(k) if not isinstance(k, int) else k
                self._label_to_idx[str(v).lower()] = idx
            logger.info("NLI CrossEncoder loaded: %s on %s", name, device)
        except Exception as e:
            logger.warning("NLI model load failed, using lexical fallback: %s", e)
            self._model = None

    def validate_response(
        self,
        retrieved_chunks: str,
        generated_response: str,
        return_all_scores: bool = True,
    ) -> Dict[str, float]:
        if self._skip or self._model is None:
            return _lexical_entailment_proxy(retrieved_chunks, generated_response)

        premise = (retrieved_chunks or "")[:6000]
        hypothesis = (generated_response or "")[:1800]

        try:
            logits = self._model.predict([(premise, hypothesis)], convert_to_numpy=True)
            if logits is None:
                return _lexical_entailment_proxy(retrieved_chunks, generated_response)
            row = np.asarray(logits).reshape(-1)
            if row.size == 1:
                return _lexical_entailment_proxy(retrieved_chunks, generated_response)

            probs = _softmax(row)

            out = {"contradiction": 0.0, "neutral": 0.0, "entailment": 0.0}
            if self._label_to_idx:
                for label, idx in self._label_to_idx.items():
                    key = _normalize_label(label)
                    if key in out and idx < len(probs):
                        out[key] = float(probs[idx])
            else:
                if len(probs) >= 3:
                    out["contradiction"] = float(probs[0])
                    out["entailment"] = float(probs[1])
                    out["neutral"] = float(probs[2])

            total = sum(out.values()) or 1.0
            out = {k: v / total for k, v in out.items()}
            return out
        except Exception as e:
            logger.error("NLI inference error: %s", e)
            return _lexical_entailment_proxy(retrieved_chunks, generated_response)

    def is_response_valid(
        self,
        retrieved_chunks: str,
        generated_response: str,
        threshold: float = None,
    ) -> Tuple[bool, float]:
        thr = threshold if threshold is not None else settings.min_confidence_threshold
        scores = self.validate_response(retrieved_chunks, generated_response)
        entailment_score = scores["entailment"]
        return entailment_score >= thr, entailment_score

    def get_confidence_explanation(self, entailment_score: float) -> str:
        if entailment_score >= 0.85:
            return "Highly confident: answer aligns strongly with retrieved context."
        if entailment_score >= 0.70:
            return "Confident: answer is reasonably supported by retrieved context."
        if entailment_score >= 0.50:
            return "Uncertain: weak support from retrieved context."
        return "Unverified: not adequately supported by retrieved context."

    def batch_validate(self, premises: list, hypotheses: list) -> list:
        if len(premises) != len(hypotheses):
            raise ValueError("Premises and hypotheses must have same length")
        return [self.validate_response(p, h) for p, h in zip(premises, hypotheses)]


def _softmax(x: np.ndarray) -> np.ndarray:
    x = x.astype(np.float64)
    x = x - np.max(x)
    e = np.exp(x)
    return e / (np.sum(e) + 1e-12)


def _normalize_label(label: str) -> str:
    s = label.lower()
    if "contradict" in s:
        return "contradiction"
    if "entail" in s:
        return "entailment"
    if "neutral" in s:
        return "neutral"
    return s


nli_agent: Optional[NLICriticAgent] = None


def get_nli_agent() -> NLICriticAgent:
    global nli_agent
    if nli_agent is None:
        nli_agent = NLICriticAgent()
    return nli_agent
