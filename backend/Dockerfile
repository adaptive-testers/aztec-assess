FROM python:3.13.7-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (psycopg2)
RUN apt-get update && apt-get install -y build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*

# Poetry
RUN pip install poetry

# Only copy lockfiles first for layer caching
COPY pyproject.toml poetry.lock ./ 
RUN poetry install --no-interaction --no-ansi --no-root

# App code
COPY . .

# Non-root user
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Runserver (reads env via python-decouple/dj-database-url)
CMD ["poetry", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]