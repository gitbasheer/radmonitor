# Multi-stage Dockerfile for VH-RAD Traffic Monitor

# Stage 1: Build dependencies
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
	gcc \
	g++ \
	make \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements files
COPY requirements.txt requirements-production.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
	pip install --no-cache-dir -r requirements.txt && \
	pip install --no-cache-dir -r requirements-production.txt

# Stage 2: Runtime
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash raduser

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application files
COPY --chown=raduser:raduser . .

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
	chown -R raduser:raduser /app

# Switch to non-root user
USER raduser

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/home/raduser/.local/bin:${PATH}"

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
	CMD curl -f http://localhost:8000/health || exit 1

# Default command
CMD ["python", "bin/server.py"]
