"""API views for materials upload, processing, and AI question generation."""

from typing import Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.courses.models import Course
from apps.courses.permissions import IsCourseStaff
from apps.quizzes.models import Chapter

from .models import CourseMaterial, MaterialProcessingStatus
from .serializers import AiGenerateQuestionSerializer, CourseMaterialSerializer
from .services import material_processing
from .services import rag as rag_service
from .services.gemini_client import generate_question_with_rag
from .services.question_factory import validate_and_create_question
from .services.storage import upload_material_file


class CourseMaterialListCreateView(generics.ListCreateAPIView):
    """List and upload course materials (instructor/TA/owner)."""

    permission_classes = [IsAuthenticated, IsCourseStaff]
    serializer_class = CourseMaterialSerializer

    def get_course(self) -> Course:
        return get_object_or_404(Course, id=self.kwargs["course_id"])

    def get_queryset(self) -> QuerySet[CourseMaterial]:
        course = self.get_course()
        return CourseMaterial.objects.filter(course=course).order_by("-created_at")

    def list(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        course = self.get_course()
        self.check_object_permissions(request, course)
        return super().list(request, *_args, **_kwargs)

    def create(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        course = self.get_course()
        self.check_object_permissions(request, course)

        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {"detail": "Missing file field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        key, size = upload_material_file(
            course_id=str(course.id),
            file_obj=upload,
            filename=upload.name,
            content_type=getattr(upload, "content_type", "") or "application/octet-stream",
        )

        mat = CourseMaterial.objects.create(
            course=course,
            uploaded_by=request.user,
            original_filename=upload.name,
            gcs_object_key=key,
            mime_type=getattr(upload, "content_type", "") or "",
            file_size_bytes=size,
            processing_status=MaterialProcessingStatus.PENDING,
        )

        try:
            material_processing.process_course_material(mat.id)
        except Exception as exc:  # noqa: BLE001
            mat.refresh_from_db()
            return Response(
                {
                    "detail": "Processing failed.",
                    "material": CourseMaterialSerializer(mat).data,
                    "error": str(exc),
                },
                status=status.HTTP_201_CREATED,
            )

        mat.refresh_from_db()
        return Response(
            CourseMaterialSerializer(mat).data,
            status=status.HTTP_201_CREATED,
        )


class AiGenerateQuestionView(generics.GenericAPIView):
    """
    RAG + Gemini structured tool call; creates a pending_review Question.

    POST body: {"query": "..."}
    """

    permission_classes = [IsAuthenticated, IsCourseStaff]
    serializer_class = AiGenerateQuestionSerializer

    def post(self, request: Request, chapter_id: int) -> Response:
        chapter = get_object_or_404(Chapter, id=chapter_id)
        self.check_object_permissions(request, chapter.course)

        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        query = ser.validated_data["query"]

        course_id = str(chapter.course.pk)
        chunks = rag_service.retrieve_context_chunks(
            course_id=course_id,
            query_text=query,
            top_k=8,
        )
        if not chunks:
            return Response(
                {"detail": "No indexed course materials found. Upload and process materials first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tool_args = generate_question_with_rag(
                context_chunks=chunks,
                user_query=query,
                log_user_id=str(request.user.pk),
                log_course_id=str(course_id),
            )
            question = validate_and_create_question(
                chapter_id=int(chapter.pk),
                tool_args=tool_args,
                created_by_id=str(request.user.pk),
            )
        except RuntimeError as e:
            if "GEMINI_API_KEY" in str(e):
                return Response(
                    {"detail": "AI is not configured (GEMINI_API_KEY)."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            raise
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        from apps.quizzes.serializers import QuestionCreateUpdateSerializer

        return Response(
            QuestionCreateUpdateSerializer(question).data,
            status=status.HTTP_201_CREATED,
        )
