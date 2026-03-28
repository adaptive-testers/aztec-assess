"""Retrieve top material chunks by embedding similarity for a course."""

from __future__ import annotations

from apps.ai.models import MaterialChunk
from apps.ai.services import gemini_client


def retrieve_context_chunks(
    *,
    course_id: str,
    query_text: str,
    top_k: int = 5,
) -> list[str]:
    """Return text of top-k chunks by cosine similarity to the query embedding."""
    q_emb = gemini_client.embed_query(query_text)
    cid = str(course_id)

    chunks = (
        MaterialChunk.objects.filter(material__course_id=cid)
        .exclude(embedding=[])
        .select_related("material")
    )

    scored: list[tuple[float, str]] = []
    for ch in chunks:
        emb = ch.embedding
        if not isinstance(emb, list) or len(emb) != len(q_emb):
            continue
        emb_f = [float(x) for x in emb]
        sim = gemini_client.cosine_similarity(q_emb, emb_f)
        scored.append((sim, ch.text))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [t for _, t in scored[:top_k]]
