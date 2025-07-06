#!/bin/bash
# Deploy MBHealth using Helm

set -e

# Configuration
CHART_PATH="k8s/helm/mbhealth"
RELEASE_NAME=${RELEASE_NAME:-mbhealth}
NAMESPACE=${NAMESPACE:-mbhealth}
ENVIRONMENT=${ENVIRONMENT:-development}
VALUES_FILE=""
DRY_RUN=${DRY_RUN:-false}
UPGRADE=${UPGRADE:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy MBHealth using Helm

OPTIONS:
    -e, --environment     Environment (development|staging|production) [default: development]
    -n, --namespace       Kubernetes namespace [default: mbhealth]
    -r, --release         Helm release name [default: mbhealth]
    -f, --values-file     Additional values file
    -u, --upgrade         Upgrade existing release
    -d, --dry-run         Perform dry run only
    -h, --help           Show this help message

EXAMPLES:
    # Deploy development environment
    $0 -e development

    # Deploy staging with custom namespace
    $0 -e staging -n mbhealth-staging -r mbhealth-staging

    # Deploy production with external secrets
    $0 -e production -f custom-values.yaml

    # Upgrade existing deployment
    $0 -e production -u

    # Dry run to preview changes
    $0 -e production -d

ENVIRONMENT VARIABLES:
    RELEASE_NAME         Helm release name
    NAMESPACE           Kubernetes namespace
    ENVIRONMENT         Deployment environment
    DRY_RUN            Perform dry run (true/false)
    UPGRADE            Upgrade existing release (true/false)
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -f|--values-file)
            VALUES_FILE="$2"
            shift 2
            ;;
        -u|--upgrade)
            UPGRADE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    development|staging|production)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_error "Valid environments: development, staging, production"
        exit 1
        ;;
esac

# Set values file based on environment
ENV_VALUES_FILE="$CHART_PATH/values-${ENVIRONMENT}.yaml"

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v helm &> /dev/null; then
        print_error "Helm is not installed"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    if [ ! -d "$CHART_PATH" ]; then
        print_error "Chart not found at: $CHART_PATH"
        exit 1
    fi
    
    if [ ! -f "$ENV_VALUES_FILE" ]; then
        print_error "Environment values file not found: $ENV_VALUES_FILE"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Validate Helm chart
validate_chart() {
    print_status "Validating Helm chart..."
    
    if ! helm lint "$CHART_PATH"; then
        print_error "Helm chart validation failed"
        exit 1
    fi
    
    print_status "Chart validation passed"
}

# Create namespace if it doesn't exist
create_namespace() {
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_status "Namespace $NAMESPACE already exists"
    else
        print_status "Creating namespace $NAMESPACE..."
        kubectl create namespace "$NAMESPACE"
    fi
}

# Build Helm command
build_helm_command() {
    local cmd=""
    
    if [ "$UPGRADE" = true ]; then
        if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
            cmd="helm upgrade"
        else
            print_warning "Release $RELEASE_NAME not found, performing install instead"
            cmd="helm install"
        fi
    else
        cmd="helm install"
    fi
    
    cmd="$cmd $RELEASE_NAME $CHART_PATH"
    cmd="$cmd --namespace $NAMESPACE"
    cmd="$cmd --create-namespace"
    cmd="$cmd --values $ENV_VALUES_FILE"
    
    if [ -n "$VALUES_FILE" ] && [ -f "$VALUES_FILE" ]; then
        cmd="$cmd --values $VALUES_FILE"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        cmd="$cmd --dry-run --debug"
    fi
    
    echo "$cmd"
}

# Deploy application
deploy() {
    local helm_cmd
    helm_cmd=$(build_helm_command)
    
    print_status "Deploying MBHealth..."
    print_info "Release: $RELEASE_NAME"
    print_info "Namespace: $NAMESPACE"
    print_info "Environment: $ENVIRONMENT"
    print_info "Values file: $ENV_VALUES_FILE"
    
    if [ -n "$VALUES_FILE" ]; then
        print_info "Additional values: $VALUES_FILE"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "Performing dry run only"
    fi
    
    echo
    print_status "Executing: $helm_cmd"
    echo
    
    if eval "$helm_cmd"; then
        if [ "$DRY_RUN" = false ]; then
            print_status "Deployment completed successfully!"
        else
            print_status "Dry run completed successfully!"
        fi
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Check deployment status
check_status() {
    if [ "$DRY_RUN" = true ]; then
        return
    fi
    
    print_status "Checking deployment status..."
    
    # Wait for deployment to be ready
    print_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available deployment \
        -l app.kubernetes.io/instance="$RELEASE_NAME" \
        -n "$NAMESPACE" --timeout=300s
    
    # Check pod status
    echo
    print_status "Pod status:"
    kubectl get pods -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE"
    
    # Check service status
    echo
    print_status "Service status:"
    kubectl get services -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE"
    
    # Check ingress status
    echo
    print_status "Ingress status:"
    kubectl get ingress -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE"
    
    # Get Helm status
    echo
    print_status "Helm release status:"
    helm status "$RELEASE_NAME" -n "$NAMESPACE"
}

# Show access information
show_access_info() {
    if [ "$DRY_RUN" = true ]; then
        return
    fi
    
    echo
    print_status "Access Information:"
    
    # Get ingress information
    INGRESS_IP=$(kubectl get ingress -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    INGRESS_HOST=$(kubectl get ingress -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    INGRESS_DOMAIN=$(kubectl get ingress -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
    
    if [ -n "$INGRESS_DOMAIN" ]; then
        if [ "$ENVIRONMENT" = "development" ]; then
            echo "  Application URL: http://$INGRESS_DOMAIN"
            echo "  API Documentation: http://$INGRESS_DOMAIN/docs"
        else
            echo "  Application URL: https://$INGRESS_DOMAIN"
            echo "  API Documentation: https://$INGRESS_DOMAIN/docs"
        fi
    fi
    
    if [ -n "$INGRESS_IP" ]; then
        echo "  Ingress IP: $INGRESS_IP"
    elif [ -n "$INGRESS_HOST" ]; then
        echo "  Ingress Host: $INGRESS_HOST"
    fi
    
    echo
    print_info "Useful commands:"
    echo "  View logs:     kubectl logs -f deployment/$RELEASE_NAME-backend -n $NAMESPACE"
    echo "  Port forward:  kubectl port-forward service/$RELEASE_NAME-frontend 8080:80 -n $NAMESPACE"
    echo "  Helm status:   helm status $RELEASE_NAME -n $NAMESPACE"
    echo "  Upgrade:       $0 -e $ENVIRONMENT -u"
}

# Main execution
main() {
    print_status "MBHealth Helm Deployment"
    echo
    
    check_prerequisites
    validate_chart
    create_namespace
    deploy
    check_status
    show_access_info
    
    echo
    print_status "Deployment process completed!"
}

# Run main function
main "$@"