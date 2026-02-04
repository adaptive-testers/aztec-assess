# Package initializer for quizzes services.
# Keep this file so Python treats `services` as a package.
# Export the primary selection helpers here so other modules can import them directly:
#
#   from apps.quizzes.services import select_next_question, next_difficulty_after
#
from .selection import select_next_question, next_difficulty_after

__all__ = ["select_next_question", "next_difficulty_after"]