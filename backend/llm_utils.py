"""
Shared text generation: OpenRouter (if OPENROUTER_API_KEY), else Gemini, else OpenAI.

Supports both simple text generation and chat-style (system + user) generation
for proper prompt engineering with RAG pipelines.
"""

from __future__ import annotations

import logging
import os
from typing import List, Optional

from backend.config import settings

logger = logging.getLogger(__name__)


def _gemini_key() -> str:
    return (settings.gemini_api_key or os.getenv("GOOGLE_API_KEY", "")).strip()


def has_llm_configured() -> bool:
    return bool(
        settings.openrouter_api_key.strip()
        or _gemini_key()
        or settings.openai_api_key.strip()
    )


def _gemini_model_for_text() -> str:
    """Map legacy/vision-only IDs to a model that supports text generateContent."""
    m = (settings.gemini_model or "gemini-1.5-flash").strip()
    low = m.lower()
    if low in ("gemini-pro-vision", "gemini-1.0-pro-vision") or (
        "vision" in low and "1.5" not in low and "2." not in low and "2-" not in low
    ):
        logger.warning(
            "GEMINI_MODEL=%s is not valid for text generation; using gemini-1.5-flash",
            m,
        )
        return "gemini-1.5-flash"
    return m


# ---------------------------------------------------------------------------
#  OpenRouter (OpenAI-compatible)
# ---------------------------------------------------------------------------
def _openrouter_chat(
    messages: List[dict],
    *,
    temperature: float,
    max_output_tokens: int,
) -> Optional[str]:
    key = settings.openrouter_api_key.strip()
    if not key:
        return None
    try:
        from openai import OpenAI

        base = (settings.openrouter_base_url or "https://openrouter.ai/api/v1").strip()
        kwargs: dict = {"api_key": key, "base_url": base}
        headers: dict[str, str] = {}
        ref = (settings.openrouter_http_referer or "").strip()
        if ref:
            headers["HTTP-Referer"] = ref
        if settings.app_name:
            headers["X-Title"] = settings.app_name
        if headers:
            kwargs["default_headers"] = headers
        client = OpenAI(**kwargs)
        response = client.chat.completions.create(
            model=(settings.openrouter_model or "openai/gpt-4o-mini").strip(),
            messages=messages,
            temperature=temperature,
            max_tokens=min(max_output_tokens, 16384),
            top_p=0.9,
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error("OpenRouter generation failed: %s", e)
        return None


# ---------------------------------------------------------------------------
#  Gemini
# ---------------------------------------------------------------------------
def _gemini_chat(
    messages: List[dict],
    *,
    temperature: float,
    max_output_tokens: int,
) -> Optional[str]:
    key = _gemini_key()
    if not key:
        return None

    import google.generativeai as genai

    genai.configure(api_key=key)
    cfg = genai.types.GenerationConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )

    # Extract system instruction and user content from messages
    system_text = ""
    user_parts = []
    for msg in messages:
        if msg["role"] == "system":
            system_text += msg["content"] + "\n"
        else:
            user_parts.append(msg["content"])
    user_text = "\n".join(user_parts)

    primary = _gemini_model_for_text()
    fallbacks = [
        primary,
        "gemini-2.0-flash",
        "gemini-2.0-flash-001",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
    ]
    seen: set[str] = set()
    ordered = []
    for name in fallbacks:
        if name and name not in seen:
            seen.add(name)
            ordered.append(name)

    last_err: Optional[Exception] = None
    for model_name in ordered:
        try:
            model_kwargs = {}
            if system_text.strip():
                model_kwargs["system_instruction"] = system_text.strip()
            model = genai.GenerativeModel(model_name, **model_kwargs)
            response = model.generate_content(user_text, generation_config=cfg)
            if not response.candidates:
                logger.warning("Gemini returned no candidates (blocked or empty)")
                continue
            text = getattr(response, "text", None)
            if not text and response.candidates:
                parts = response.candidates[0].content.parts
                text = "".join(getattr(p, "text", "") for p in parts)
            if text:
                if model_name != primary:
                    logger.info("Gemini OK using model %s", model_name)
                return text.strip()
        except Exception as e:
            last_err = e
            err_s = str(e).lower()
            if "429" in err_s or "quota" in err_s or "resource exhausted" in err_s:
                logger.error("Gemini rate limit / quota: %s", e)
                break
            if "404" not in str(e) and "not found" not in err_s:
                logger.error("Gemini generation failed: %s", e)
                break
            continue
    if last_err:
        logger.error("Gemini generation failed (tried %s): %s", ordered, last_err)
    return None


# ---------------------------------------------------------------------------
#  OpenAI direct
# ---------------------------------------------------------------------------
def _openai_chat(
    messages: List[dict],
    *,
    temperature: float,
    max_output_tokens: int,
) -> Optional[str]:
    if not settings.openai_api_key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=temperature,
            max_tokens=min(max_output_tokens, 16384),
            top_p=0.9,
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error("OpenAI generation failed: %s", e)
        return None


# ---------------------------------------------------------------------------
#  Public API — chat-style (system + user messages)
# ---------------------------------------------------------------------------
def generate_chat(
    system_prompt: str,
    user_message: str,
    *,
    temperature: float = 0.2,
    max_output_tokens: int = 2048,
) -> Optional[str]:
    """
    Generate text using proper chat-style messages with system/user separation.

    This is the preferred function for RAG and structured prompting — it ensures
    the system prompt is sent in the correct role so the model follows instructions.

    Returns generated text, or None if no provider is configured or generation fails.
    Order: OpenRouter → Gemini → OpenAI.
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    if settings.openrouter_api_key.strip():
        out = _openrouter_chat(
            messages, temperature=temperature, max_output_tokens=max_output_tokens
        )
        if out:
            return out

    if _gemini_key():
        out = _gemini_chat(
            messages, temperature=temperature, max_output_tokens=max_output_tokens
        )
        if out:
            return out

    out = _openai_chat(
        messages, temperature=temperature, max_output_tokens=max_output_tokens
    )
    if out:
        return out

    return None


# ---------------------------------------------------------------------------
#  Public API — simple (backward-compatible, single prompt string)
# ---------------------------------------------------------------------------
def generate_text(
    prompt: str,
    *,
    temperature: float = 0.2,
    max_output_tokens: int = 2048,
) -> Optional[str]:
    """
    Simple text generation from a single prompt string (backward-compatible).

    Internally delegates to generate_chat with a sensible default system prompt.
    For better results with RAG, use generate_chat() directly.
    """
    return generate_chat(
        system_prompt=(
            "You are a helpful, accurate, and thorough AI assistant. "
            "Answer the user's question clearly and completely. "
            "If the question includes context or reference material, "
            "base your answer strictly on that material. "
            "Use well-structured formatting with bullet points and headings when appropriate."
        ),
        user_message=prompt,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )
