#!/bin/bash
# Build and tag Docker images for Kubernetes deployment

set -e

# Configuration
REGISTRY=${DOCKER_REGISTRY:-"docker.io"}
NAMESPACE=${DOCKER_NAMESPACE:-"mbhealth"}
VERSION=${VERSION:-"latest"}
BUILD_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to build and tag image
build_image() {
    local name=$1
    local context=$2
    local dockerfile=$3
    local target=$4
    
    print_status "Building $name image..."
    
    local image_name="${REGISTRY}/${NAMESPACE}/${name}"
    
    # Build the image
    docker build \
        --target "$target" \
        -f "$dockerfile" \
        -t "${image_name}:${VERSION}" \
        -t "${image_name}:${BUILD_TIMESTAMP}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VERSION="${VERSION}" \
        "$context"
    
    if [ $? -eq 0 ]; then
        print_status "Successfully built ${image_name}:${VERSION}"
        
        # Get image size
        size=$(docker images "${image_name}:${VERSION}" --format "{{.Size}}")
        print_status "Image size: $size"
    else
        print_error "Failed to build $name image"
        exit 1
    fi
}

# Main execution
print_status "Starting Docker image builds for MBHealth"
print_status "Registry: ${REGISTRY}/${NAMESPACE}"
print_status "Version: ${VERSION}"

# Build backend image
build_image "backend" "./backend" "./backend/Dockerfile.optimized" "production"

# Build worker image
build_image "worker" "./backend" "./backend/Dockerfile.worker" "production"

# Build frontend image
build_image "frontend" "./frontend" "./frontend/Dockerfile.optimized" "production"

print_status "All images built successfully!"

# Optional: Push images to registry
if [ "$1" == "--push" ]; then
    print_status "Pushing images to registry..."
    
    docker push "${REGISTRY}/${NAMESPACE}/backend:${VERSION}"
    docker push "${REGISTRY}/${NAMESPACE}/backend:${BUILD_TIMESTAMP}"
    
    docker push "${REGISTRY}/${NAMESPACE}/worker:${VERSION}"
    docker push "${REGISTRY}/${NAMESPACE}/worker:${BUILD_TIMESTAMP}"
    
    docker push "${REGISTRY}/${NAMESPACE}/frontend:${VERSION}"
    docker push "${REGISTRY}/${NAMESPACE}/frontend:${BUILD_TIMESTAMP}"
    
    print_status "All images pushed successfully!"
fi

# Show built images
print_status "Built images:"
docker images | grep "${NAMESPACE}" | grep -E "(${VERSION}|${BUILD_TIMESTAMP})"