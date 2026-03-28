"""
Centralized Gemini client: init, embeddings, generation with structured tool calling.

All Gemini usage must go through this module (no direct SDK calls from views/serializers).
"""

from __future__ import annotations

import time
from typing import Any

from django.conf import settings

_client_configured = False


def _ensure_configured() -> None:
    global _client_configured
    if _client_configured:
        return
    key = getattr(settings, "GEMINI_API_KEY", "") or ""
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    import google.generativeai as genai

    genai.configure(api_key=key)
    _client_configured = True


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embed texts; returns list of embedding vectors (list of floats)."""
    _ensure_configured()
    import google.generativeai as genai

    model_name = getattr(
        settings,
        "GEMINI_EMBEDDING_MODEL",
        "models/text-embedding-004",
    )
    out: list[list[float]] = []
    for t in texts:
        resp = genai.embed_content(
            model=model_name,
            content=t,
            task_type="retrieval_document",
        )
        emb = resp.get("embedding")
        if emb is None:
            raise RuntimeError("embed_content returned no embedding")
        out.append(list(emb))
    return out


def embed_query(text: str) -> list[float]:
    """Single query embedding for retrieval."""
    _ensure_configured()
    import google.generativeai as genai

    model_name = getattr(
        settings,
        "GEMINI_EMBEDDING_MODEL",
        "models/text-embedding-004",
    )
    resp = genai.embed_content(
        model=model_name,
        content=text,
        task_type="retrieval_query",
    )
    emb = resp.get("embedding")
    if emb is None:
        raise RuntimeError("embed_content returned no embedding")
    return list(emb)


def _create_question_tool() -> Any:
    from google.generativeai.types import FunctionDeclaration, Tool

    declaration = FunctionDeclaration(
        name="create_question",
        description="Return a single multiple-choice question with four options.",
        parameters={
            "type": "object",
            "properties": {
                "question_text": {"type": "string"},
                "answer_options": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 4,
                    "maxItems": 4,
                },
                "correct_answer": {"type": "integer", "description": "0-3 index"},
                "difficulty": {
                    "type": "string",
                    "enum": ["EASY", "MEDIUM", "HARD"],
                },
                "suggested_topics": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Topic UUID strings for this course",
                },
            },
            "required": [
                "question_text",
                "answer_options",
                "correct_answer",
                "difficulty",
                "suggested_topics",
            ],
        },
    )
    return Tool(function_declarations=[declaration])


def generate_question_with_rag(
    *,
    context_chunks: list[str],
    user_query: str,
    log_user_id: str | None,
    log_course_id: str | None,
) -> dict[str, Any]:
    """
    Call Gemini with RAG context and require create_question tool call.

    Returns parsed function args dict or raises on failure / invalid response.
    """
    _ensure_configured()
    import google.generativeai as genai

    model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
    context_block = "\n\n---\n\n".join(context_chunks[:12])
    prompt = (
        "You are an assistant that writes exam questions grounded ONLY in the context below.\n"
        "You must call the function create_question with valid fields.\n"
        "Do not invent facts outside the context.\n\n"
        f"Context:\n{context_block}\n\n"
        f"Instructor request:\n{user_query}\n"
    )

    tool = _create_question_tool()
    model = genai.GenerativeModel(
        model_name,
        tools=[tool],
    )

    start = time.monotonic()
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
        ),
    )
    elapsed = time.monotonic() - start

    if not response.candidates:
        raise ValueError("No candidates in Gemini response")

    parts = response.candidates[0].content.parts
    for part in parts:
        fc = getattr(part, "function_call", None)
        if fc is not None:
            if fc.name != "create_question":
                raise ValueError(f"Unexpected tool: {fc.name}")
            args = dict(fc.args)
            _log_interaction(
                operation="generate_question",
                model_name=model_name,
                prompt_tokens=_estimate_tokens(prompt),
                response_tokens=_estimate_tokens(str(args)),
                user_id=log_user_id,
                course_id=log_course_id,
                extra={"elapsed_ms": int(elapsed * 1000)},
            )
            return args

    raise ValueError("Model did not return a create_question tool call")


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _log_interaction(
    *,
    operation: str,
    model_name: str,
    prompt_tokens: int | None,
    response_tokens: int | None,
    user_id: str | None,
    course_id: str | None,
    extra: dict[str, Any] | None = None,
) -> None:
    from apps.ai.models import AiInteractionLog

    AiInteractionLog.objects.create(
        user_id=user_id,
        course_id=course_id,
        operation=operation,
        model_name=model_name,
        prompt_tokens=prompt_tokens,
        response_tokens=response_tokens,
        metadata=extra or {},
    )


def cosine_similarity(a: list[float], b: list[float]) -> float:
    import math

    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
