# ArgoCD GitOps Deployment for MBHealth

This directory contains ArgoCD configurations for implementing GitOps-based continuous deployment of MBHealth.

## Overview

ArgoCD is a declarative, GitOps continuous delivery tool for Kubernetes that:
- Monitors Git repositories for changes
- Automatically syncs desired state to Kubernetes clusters
- Provides real-time visibility into deployment status
- Enables easy rollbacks and drift detection

## Directory Structure

```
argocd/
├── applications/           # ArgoCD Application definitions
│   ├── mbhealth-dev.yaml      # Development environment
│   ├── mbhealth-staging.yaml  # Staging environment
│   └── mbhealth-production.yaml # Production environment
├── projects/              # ArgoCD AppProject for RBAC
│   └── mbhealth-project.yaml
├── install/               # Installation scripts
│   └── install-argocd.sh
└── ingress/              # Service exposure configurations
    └── argocd-nodeport.yaml
```

## Installation

### Quick Install

```bash
# Run the installation script
./install/install-argocd.sh

# This will:
# 1. Create the argocd namespace
# 2. Install ArgoCD components
# 3. Wait for services to be ready
# 4. Display the admin password
```

### Manual Installation

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for deployments
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## Accessing ArgoCD

### Option 1: Port Forwarding (Development)
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Access at: https://localhost:8080
# Username: admin
# Password: <see above>
```

### Option 2: NodePort Service (K3s/Bare Metal)
```bash
kubectl apply -f ingress/argocd-nodeport.yaml
# Access at: http://<any-node-ip>:30080
```

### Option 3: Ingress (Production)
Configure your ingress controller and domain, then apply appropriate ingress configuration.

## Deploying MBHealth Applications

### 1. Create Applications

```bash
# Deploy all environments
kubectl apply -f applications/

# Or deploy specific environments
kubectl apply -f applications/mbhealth-dev.yaml
kubectl apply -f applications/mbhealth-staging.yaml
kubectl apply -f applications/mbhealth-production.yaml
```

### 2. Application Configuration

Each application is configured with:

- **Source**: Points to this Git repository
- **Path**: `k8s/helm/mbhealth` (Helm chart location)
- **Target Revision**: Branch or tag to deploy
- **Values Files**: Environment-specific values
- **Sync Policy**: Automatic (dev/staging) or manual (production)

### 3. Sync Policies

#### Development (Auto-sync)
```yaml
syncPolicy:
  automated:
    prune: true      # Remove resources not in Git
    selfHeal: true   # Fix drift automatically
```

#### Production (Manual sync)
```yaml
syncPolicy:
  # No automated sync - requires manual approval
  syncOptions:
    - CreateNamespace=true
```

## ArgoCD CLI Usage

### Installation
```bash
# Download latest release
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64
```

### Login
```bash
argocd login <server-address> --username admin --password <password>
```

### Common Commands
```bash
# List applications
argocd app list

# Get application details
argocd app get mbhealth-dev

# Sync application
argocd app sync mbhealth-dev

# View history
argocd app history mbhealth-dev

# Rollback
argocd app rollback mbhealth-production <revision>

# Delete application
argocd app delete mbhealth-dev
```

## GitOps Workflow

### Development Workflow
1. Developer pushes code to feature branch
2. CI pipeline builds and tags images
3. Update `values-development.yaml` with new image tags
4. ArgoCD detects changes and auto-syncs

### Production Workflow
1. Create release tag
2. CI pipeline builds production images
3. Update `values-production.yaml` with release tags
4. Create PR for review
5. Merge PR after approval
6. Manually sync in ArgoCD UI or CLI

## Monitoring and Troubleshooting

### Application Health
```bash
# Check application health
argocd app get mbhealth-dev --refresh

# View live manifests
argocd app manifests mbhealth-dev

# Compare desired vs live state
argocd app diff mbhealth-dev
```

### Debugging Sync Issues
```bash
# Check sync status
kubectl describe application mbhealth-dev -n argocd

# View events
kubectl get events -n mbhealth-dev --sort-by='.lastTimestamp'

# Check ArgoCD logs
kubectl logs -n argocd deployment/argocd-repo-server
kubectl logs -n argocd deployment/argocd-application-controller
```

### Common Issues

1. **Repository not accessible**
   - Ensure GitHub repository is public or add SSH/token credentials
   - Check network connectivity from cluster

2. **Image pull errors**
   - Verify image tags exist in registry
   - Check image pull secrets configuration

3. **Resource conflicts**
   - Check for manually created resources
   - Use `argocd app sync --force` to override

4. **Helm errors**
   - Validate Helm chart: `helm lint k8s/helm/mbhealth`
   - Check values file syntax

## Security Best Practices

1. **Change default admin password**
   ```bash
   argocd account update-password
   ```

2. **Enable RBAC**
   - Use AppProjects to limit access
   - Configure user roles and permissions

3. **Use private repositories**
   - Configure repository credentials
   - Use SSH keys or access tokens

4. **Enable TLS**
   - Use proper certificates for production
   - Configure ingress with TLS termination

## Advanced Configuration

### Multi-Cluster Deployment
```bash
# Add external cluster
argocd cluster add <context-name>

# List clusters
argocd cluster list
```

### Notifications
Configure notifications for deployment events using ArgoCD Notifications.

### Metrics and Monitoring
ArgoCD exposes Prometheus metrics at `/metrics` endpoint for monitoring.

## Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [GitOps Principles](https://www.gitops.tech/)