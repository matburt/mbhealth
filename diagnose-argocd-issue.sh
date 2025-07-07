#!/bin/bash

echo "=== ArgoCD MBHealth Dev Diagnostics ==="
echo

# Check if namespace exists
echo "1. Checking namespace..."
kubectl get namespace mbhealth-dev || echo "❌ Namespace mbhealth-dev does not exist"
echo

# Check ArgoCD application
echo "2. Checking ArgoCD application..."
kubectl get application mbhealth-dev -n argocd || echo "❌ ArgoCD application mbhealth-dev not found"
echo

# Check application status
echo "3. ArgoCD application status..."
kubectl get application mbhealth-dev -n argocd -o jsonpath='{.status.sync.status}' 2>/dev/null || echo "❌ Cannot get sync status"
echo
kubectl get application mbhealth-dev -n argocd -o jsonpath='{.status.health.status}' 2>/dev/null || echo "❌ Cannot get health status"
echo

# Check service accounts
echo "4. Checking service accounts in mbhealth-dev namespace..."
kubectl get serviceaccount -n mbhealth-dev || echo "❌ Cannot list service accounts (namespace may not exist)"
echo

# Check for migration service account specifically
echo "5. Checking for migration service account..."
kubectl get serviceaccount mbhealth-dev-migration -n mbhealth-dev || echo "❌ Service account mbhealth-dev-migration not found"
echo

# Check Helm releases
echo "6. Checking Helm releases..."
helm list -n mbhealth-dev || echo "❌ No Helm releases found in mbhealth-dev namespace"
echo

# Check migration job
echo "7. Checking migration job..."
kubectl get job -n mbhealth-dev | grep migration || echo "❌ No migration jobs found"
echo

# Check pods with issues
echo "8. Checking failed pods..."
kubectl get pods -n mbhealth-dev --field-selector=status.phase=Failed || echo "ℹ️ No failed pods found"
echo

# Check events
echo "9. Recent events in mbhealth-dev namespace..."
kubectl get events -n mbhealth-dev --sort-by='.lastTimestamp' | tail -10 || echo "❌ Cannot get events"
echo

echo "=== Diagnostic Complete ==="
echo
echo "💡 To fix the immediate issue, apply the temporary service account:"
echo "   kubectl apply -f temp-service-account.yaml"
echo
echo "🔧 To fix the root cause, sync the ArgoCD application:"
echo "   argocd app sync mbhealth-dev --force"
echo "   OR"
echo "   kubectl patch application mbhealth-dev -n argocd --type merge -p '{\"operation\":{\"sync\":{\"revision\":\"HEAD\"}}}'"