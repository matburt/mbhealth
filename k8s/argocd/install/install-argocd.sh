#!/bin/bash
# Install ArgoCD on Kubernetes cluster

set -e

NAMESPACE="argocd"
VERSION="v2.9.3"

echo "Installing ArgoCD ${VERSION}..."

# Create namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Install ArgoCD
kubectl apply -n $NAMESPACE -f https://raw.githubusercontent.com/argoproj/argo-cd/${VERSION}/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available deployment/argocd-server -n $NAMESPACE --timeout=300s

# Get initial admin password
echo "Getting initial admin password..."
ADMIN_PASSWORD=$(kubectl -n $NAMESPACE get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo "ArgoCD installed successfully!"
echo "Admin password: $ADMIN_PASSWORD"
echo ""
echo "To access ArgoCD:"
echo "1. Port forward: kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "2. Open browser: https://localhost:8080"
echo "3. Login: admin / $ADMIN_PASSWORD"
echo ""
echo "To expose via ingress, apply: kubectl apply -f k8s/argocd/ingress/"