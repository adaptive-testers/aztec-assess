# Helper functions for the Courses app (e.g., join code generation).

import secrets
import string


def generate_join_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))
