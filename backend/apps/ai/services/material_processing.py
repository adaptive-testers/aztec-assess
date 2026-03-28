"""Process uploaded materials: extract text, chunk, embed, persist chunks."""

from __future__ import annotations

from apps.ai.models import CourseMaterial, MaterialChunk, MaterialProcessingStatus
from apps.ai.services import embeddings as emb_svc
from apps.ai.services import text_extraction


def process_course_material(material_id: str) -> None:
    """Run extraction, chunking, embedding, and chunk persistence."""
    mat = CourseMaterial.objects.get(pk=material_id)
    mat.processing_status = MaterialProcessingStatus.PROCESSING
    mat.processing_error = ""
    mat.save(update_fields=["processing_status", "processing_error", "updated_at"])

    try:
        text = text_extraction.extract_text(
            storage_key=mat.gcs_object_key,
            mime_type=mat.mime_type,
        )
        pieces = emb_svc.chunk_text(text)
        if not pieces:
            mat.processing_status = MaterialProcessingStatus.FAILED
            mat.processing_error = "No extractable text."
            mat.save(update_fields=["processing_status", "processing_error", "updated_at"])
            return

        vectors = emb_svc.embed_chunks(pieces)
        if len(vectors) != len(pieces):
            raise RuntimeError("Embedding count mismatch")

        MaterialChunk.objects.filter(material=mat).delete()
        for i, (piece, vec) in enumerate(zip(pieces, vectors, strict=True)):
            MaterialChunk.objects.create(
                material=mat,
                chunk_index=i,
                text=piece,
                embedding=vec,
                token_count=len(piece) // 4,
            )

        mat.processing_status = MaterialProcessingStatus.READY
        mat.save(update_fields=["processing_status", "updated_at"])
    except Exception as exc:  # noqa: BLE001
        mat.processing_status = MaterialProcessingStatus.FAILED
        mat.processing_error = str(exc)[:2000]
        mat.save(update_fields=["processing_status", "processing_error", "updated_at"])
        raise
