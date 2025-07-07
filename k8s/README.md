# Kubernetes Deployment for MBHealth

This directory contains all Kubernetes-related configuration for deploying MBHealth to various Kubernetes environments, including support for GitOps deployment with ArgoCD.

## Directory Structure

```
k8s/
├── argocd/                  # ArgoCD GitOps configurations
│   ├── applications/       # ArgoCD application definitions
│   ├── projects/           # ArgoCD project configurations
│   ├── install/            # ArgoCD installation scripts
│   └── ingress/            # ArgoCD ingress/service configurations
├── base/                    # Base Kubernetes manifests (raw YAML)
│   ├── backend/            # Backend API deployment resources
│   ├── frontend/           # Frontend deployment resources
│   ├── worker/             # Celery worker deployment resources
│   ├── database/           # PostgreSQL configurations
│   ├── redis/              # Redis configurations
│   └── common/             # Shared resources (ConfigMaps, Secrets)
├── helm/                   # Helm charts
│   └── mbhealth/          # Main application Helm chart
│       ├── templates/      # Helm templates
│       ├── charts/         # Subcharts/dependencies
│       └── values*.yaml    # Environment-specific values
├── overlays/               # Kustomize overlays (optional)
│   ├── development/        # Dev environment patches
│   ├── staging/            # Staging environment patches
│   └── production/         # Production environment patches
├── scripts/                # Deployment and maintenance scripts
└── docs/                   # Kubernetes-specific documentation
```

## Deployment Methods

### Method 1: GitOps with ArgoCD (Recommended)

#### Install ArgoCD
```bash
# Install ArgoCD on your cluster
./argocd/install/install-argocd.sh

# Or manually:
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

#### Deploy Applications with ArgoCD
```bash
# Deploy development environment
kubectl apply -f argocd/applications/mbhealth-dev.yaml

# Deploy staging environment
kubectl apply -f argocd/applications/mbhealth-staging.yaml

# Deploy production environment (manual sync)
kubectl apply -f argocd/applications/mbhealth-production.yaml
```

#### Access ArgoCD UI
```bash
# Option 1: Port forwarding
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Option 2: NodePort service (for K3s/bare metal)
kubectl apply -f argocd/ingress/argocd-nodeport.yaml
# Access at http://<node-ip>:30080

# Option 3: Ingress (configure your domain)
kubectl apply -f argocd/ingress/argocd-ingress.yaml
```

### Method 2: Direct Helm Deployment

```bash
# Using the deployment script
./scripts/deploy-helm.sh -e development

# Or manually with Helm
helm install mbhealth ./helm/mbhealth -n mbhealth --create-namespace

# Install with specific environment values
helm install mbhealth ./helm/mbhealth -n mbhealth -f helm/mbhealth/values-production.yaml
```

### Method 3: Raw Kubernetes Manifests

```bash
# Deploy using the script
./scripts/deploy.sh

# Or manually deploy each component
kubectl apply -f base/common/
kubectl apply -f base/database/
kubectl apply -f base/redis/
kubectl apply -f base/backend/
kubectl apply -f base/frontend/
kubectl apply -f base/worker/
```

### Method 4: Kustomize
```bash
# Deploy to production
kubectl apply -k overlays/production/
```

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3.x (for Helm deployments)
- Container registry access
- ArgoCD (for GitOps deployment)

## Configuration

See individual README files in each directory for specific configuration options.

## GitOps Workflow with ArgoCD

### Overview
ArgoCD implements the GitOps pattern by:
1. **Monitoring** this Git repository for changes
2. **Automatically syncing** changes to your Kubernetes cluster
3. **Ensuring** the cluster state matches the Git repository
4. **Providing** rollback and drift detection capabilities

### Workflow
1. **Development Changes**
   - Push code changes to feature branch
   - CI pipeline builds and pushes Docker images
   - Update image tags in `values-development.yaml`
   - ArgoCD automatically deploys to dev environment

2. **Staging Deployment**
   - Merge to main branch
   - Update image tags in `values-staging.yaml`
   - ArgoCD automatically deploys to staging

3. **Production Deployment**
   - Create Git tag for release
   - Update image tags in `values-production.yaml`
   - Manually sync in ArgoCD UI or CLI
   - Monitor deployment through ArgoCD dashboard

### ArgoCD Application Structure
- **mbhealth-dev**: Auto-sync enabled, deploys from HEAD
- **mbhealth-staging**: Auto-sync enabled, deploys from main
- **mbhealth-production**: Manual sync only, deploys from tags

### Benefits of GitOps
- **Declarative**: All configurations in Git
- **Auditable**: Complete deployment history
- **Recoverable**: Easy rollbacks
- **Secure**: No cluster credentials in CI/CD
- **Observable**: Real-time deployment status

## Monitoring and Management

### ArgoCD CLI
```bash
# Login to ArgoCD
argocd login <argocd-server-url> --username admin --password <password>

# List applications
argocd app list

# Get application details
argocd app get mbhealth-dev

# Manually sync an application
argocd app sync mbhealth-production

# View application history
argocd app history mbhealth-production

# Rollback to previous version
argocd app rollback mbhealth-production <revision>
```

### Useful Commands
```bash
# Check deployment status
kubectl get all -n mbhealth-dev

# View application logs
kubectl logs -f deployment/mbhealth-backend -n mbhealth-dev

# Access metrics
kubectl port-forward svc/mbhealth-backend 8000:8000 -n mbhealth-dev
```

## Troubleshooting

### ArgoCD Issues
1. **Application not syncing**
   - Check repository access
   - Verify image tags exist
   - Review ArgoCD logs: `kubectl logs -n argocd deployment/argocd-repo-server`

2. **ComparisonError**
   - Ensure Helm chart path exists in repository
   - Check values files are present
   - Verify repository branch/tag

3. **Sync failures**
   - Check resource quotas
   - Verify RBAC permissions
   - Review application events in ArgoCD UI