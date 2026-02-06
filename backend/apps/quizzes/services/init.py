# Package initializer for quizzes services.
# Keep this file so Python treats `services` as a package.
# Export the primary selection helpers here so other modules can import them directly:
#
#   from apps.quizzes.services import select_next_question, next_difficulty_after
#

from .selection import next_difficulty_after, select_next_question

__all__ = ["select_next_question", "next_difficulty_after"]




