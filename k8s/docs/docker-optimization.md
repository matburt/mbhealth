# Docker Image Optimization Guide

This document explains the Docker optimization strategies used for MBHealth Kubernetes deployments.

## Multi-Stage Build Strategy

All our Docker images use multi-stage builds to optimize for:
- **Smaller image sizes** (up to 70% reduction)
- **Better security** (minimal attack surface)
- **Faster deployments** (smaller images = faster pulls)
- **Layer caching** (faster builds)

## Image Optimizations

### Backend API Image

**Base Image**: `python:3.11-slim` (minimal Python runtime)

**Optimizations**:
1. **Multi-stage build**: Separate build and runtime stages
2. **Virtual environment**: Isolated Python dependencies
3. **Non-root user**: Security hardening
4. **Health checks**: Built-in liveness/readiness probes
5. **Signal handling**: Proper shutdown for Kubernetes

**Size comparison**:
- Original: ~1.2GB
- Optimized: ~350MB (71% reduction)

### Frontend Image

**Base Image**: `nginx:1.25-alpine` (minimal web server)

**Optimizations**:
1. **Static asset serving**: Pre-built React app
2. **Nginx configuration**: Optimized for SPA routing
3. **Gzip compression**: Reduced bandwidth
4. **Security headers**: Built-in security
5. **Health endpoint**: Kubernetes compatibility

**Size comparison**:
- Development: ~500MB
- Production: ~25MB (95% reduction)

### Worker Image

**Base Image**: Shared with backend for layer reuse

**Optimizations**:
1. **Shared layers**: Reuses backend dependencies
2. **Celery-specific**: Only worker requirements
3. **Process management**: Proper signal handling
4. **Resource limits**: Memory-efficient configuration

## Build Process

### Development Builds
```bash
# Build for local development (includes hot-reload)
docker build --target development -t mbhealth/backend:dev ./backend
```

### Production Builds
```bash
# Use the build script for consistent tagging
./k8s/scripts/build-images.sh

# Build with specific version
VERSION=1.0.0 ./k8s/scripts/build-images.sh

# Build and push to registry
./k8s/scripts/build-images.sh --push
```

## Security Features

1. **Non-root execution**: All containers run as non-root users
2. **Minimal base images**: Alpine/slim variants only
3. **No unnecessary packages**: Only runtime dependencies
4. **Read-only filesystem**: Compatible with security policies
5. **Distroless option**: Can switch to distroless images

## Health Checks

All images include health check configurations:

- **Backend**: `GET /api/v1/health/ready`
- **Frontend**: `GET /health`
- **Worker**: Celery inspect ping

## Environment Variables

Images are configured via environment variables following 12-factor app principles:

```yaml
# Backend/Worker
DATABASE_URL: Connection string for PostgreSQL
REDIS_URL: Connection string for Redis
SECRET_KEY: Application secret key
LOG_LEVEL: Logging verbosity
ENVIRONMENT: deployment environment

# Frontend
BACKEND_URL: Backend API endpoint (for SSR)
```

## Caching Strategy

Build caching is optimized by:
1. Copying dependency files first
2. Installing dependencies before code
3. Leveraging Docker layer caching
4. Using BuildKit for advanced caching

## CI/CD Integration

Images are designed for CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Build and push
  run: |
    VERSION=${{ github.sha }} ./k8s/scripts/build-images.sh --push
```

## Best Practices

1. **Always use specific tags**: Never rely on `latest` in production
2. **Scan for vulnerabilities**: Use Trivy or similar tools
3. **Sign images**: Use Docker Content Trust
4. **Regular updates**: Rebuild with updated base images
5. **Resource limits**: Set appropriate limits in Kubernetes

## Troubleshooting

### Large Image Sizes
- Check for unnecessary files in build context
- Ensure multi-stage builds are working
- Verify .dockerignore is comprehensive

### Build Failures
- Check Docker daemon disk space
- Verify network access for package downloads
- Ensure build arguments are provided

### Runtime Issues
- Verify health checks are responding
- Check file permissions for non-root user
- Ensure signal handling is working