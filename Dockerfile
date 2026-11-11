# CommsAlign web app for Render's free plan (DECISIONS.md G2, hosting row).
# Stage 1 builds the React site; stage 2 runs the FastAPI server, which serves the site and the API.

FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /srv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements-deploy.txt ./
RUN pip install --no-cache-dir -r requirements-deploy.txt
COPY app/ app/
COPY backend/ backend/
COPY data/ data/
COPY knowledge/ knowledge/
COPY --from=web /web/dist frontend/dist
# Render sets PORT; 8000 is the local default. The Azure key and endpoint come from Render's environment settings.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
