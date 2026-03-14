FROM python:3.13.7-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

WORKDIR /app

# System deps (psycopg2)
RUN apt-get update && apt-get install -y build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*

# Poetry
RUN pip install poetry

# Configure Poetry to create virtual environments in project
RUN poetry config virtualenvs.create true && \
    poetry config virtualenvs.in-project true

# Only copy lockfiles first for layer caching
COPY pyproject.toml poetry.lock ./ 
RUN poetry install --no-interaction --no-ansi --no-root

# App code
COPY . .

# Non-root user
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["sh", "-c", "/app/.venv/bin/gunicorn adaptive_testing.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers ${WEB_CONCURRENCY:-2} --threads ${GUNICORN_THREADS:-4} --timeout ${GUNICORN_TIMEOUT:-120}"]
