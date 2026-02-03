# Backend Dockerfile for FastAPI
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install pip and setuptools
RUN pip install --upgrade pip setuptools

# Copy pyproject.toml and install dependencies
COPY pyproject.toml ./
RUN pip install .

# Copy the rest of the source code
COPY . .

# Development stage
FROM base AS development
EXPOSE 8000
CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

# Production stage
FROM base AS production
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]