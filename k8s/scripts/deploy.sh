#!/bin/bash
# Deploy MBHealth to Kubernetes

set -e

# Configuration
NAMESPACE=${NAMESPACE:-mbhealth}
ENVIRONMENT=${ENVIRONMENT:-development}
KUBECONFIG=${KUBECONFIG:-~/.kube/config}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Create namespace if it doesn't exist
create_namespace() {
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_status "Namespace $NAMESPACE already exists"
    else
        print_status "Creating namespace $NAMESPACE..."
        kubectl create namespace $NAMESPACE
    fi
}

# Deploy base manifests
deploy_base() {
    print_status "Deploying base manifests..."
    
    # Apply in order
    kubectl apply -f k8s/base/common/namespace.yaml
    
    print_warning "Please update secrets in k8s/base/common/secret.yaml before continuing"
    read -p "Have you updated the secrets? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please update secrets and run again"
        exit 1
    fi
    
    kubectl apply -f k8s/base/common/configmap.yaml
    kubectl apply -f k8s/base/common/secret.yaml
    
    # Deploy infrastructure
    print_status "Deploying database..."
    kubectl apply -f k8s/base/database/
    
    print_status "Deploying Redis..."
    kubectl apply -f k8s/base/redis/
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n $NAMESPACE --timeout=300s
    
    print_status "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n $NAMESPACE --timeout=300s
    
    # Run migrations
    print_status "Running database migrations..."
    kubectl apply -f k8s/base/common/migration-job.yaml
    kubectl wait --for=condition=complete job/mbhealth-db-migration -n $NAMESPACE --timeout=300s
    
    # Deploy application
    print_status "Deploying backend..."
    kubectl apply -f k8s/base/backend/
    
    print_status "Deploying worker..."
    kubectl apply -f k8s/base/worker/
    
    print_status "Deploying frontend..."
    kubectl apply -f k8s/base/frontend/
    
    # Deploy ingress and network policies
    print_status "Deploying ingress..."
    kubectl apply -f k8s/base/common/ingress.yaml
    
    print_status "Applying network policies..."
    kubectl apply -f k8s/base/common/network-policies.yaml
}

# Deploy with Kustomize
deploy_kustomize() {
    print_status "Deploying with Kustomize..."
    
    if [ "$ENVIRONMENT" == "production" ]; then
        kubectl apply -k k8s/overlays/production/
    elif [ "$ENVIRONMENT" == "staging" ]; then
        kubectl apply -k k8s/overlays/staging/
    else
        kubectl apply -k k8s/base/
    fi
}

# Check deployment status
check_status() {
    print_status "Checking deployment status..."
    
    kubectl get pods -n $NAMESPACE
    echo
    kubectl get services -n $NAMESPACE
    echo
    kubectl get ingress -n $NAMESPACE
    echo
    
    # Get external IP/hostname
    INGRESS_IP=$(kubectl get ingress mbhealth-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    INGRESS_HOST=$(kubectl get ingress mbhealth-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [ ! -z "$INGRESS_IP" ]; then
        print_status "Application available at: http://$INGRESS_IP"
    elif [ ! -z "$INGRESS_HOST" ]; then
        print_status "Application available at: http://$INGRESS_HOST"
    else
        print_warning "Ingress not yet ready. Check back in a few minutes."
    fi
}

# Main execution
main() {
    print_status "MBHealth Kubernetes Deployment"
    print_status "Environment: $ENVIRONMENT"
    print_status "Namespace: $NAMESPACE"
    echo
    
    check_prerequisites
    create_namespace
    
    # Choose deployment method
    if [ "$1" == "--kustomize" ]; then
        deploy_kustomize
    else
        deploy_base
    fi
    
    check_status
    
    print_status "Deployment completed!"
    print_status "Run 'kubectl logs -f deployment/mbhealth-backend -n $NAMESPACE' to view backend logs"
}

# Run main function
main "$@"