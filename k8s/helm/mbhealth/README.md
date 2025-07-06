# MBHealth Helm Chart

A comprehensive Helm chart for deploying MBHealth, a health data tracking application with AI analysis capabilities.

## Overview

This Helm chart deploys:
- **Backend API** (FastAPI with Python)
- **Celery Worker** for background processing
- **Frontend** (React SPA with nginx)
- **PostgreSQL** database (optional, can use external)
- **Redis** for caching and message queuing (optional, can use external)
- **Database migration** jobs
- **Ingress** for external access
- **Network policies** for security

## Prerequisites

- Kubernetes 1.20+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure
- Ingress controller (e.g., NGINX)

## Installation

### Quick Start

```bash
# Add the chart repository (if hosted)
helm repo add mbhealth https://charts.mbhealth.example.com
helm repo update

# Install with default values
helm install mbhealth mbhealth/mbhealth

# Or install from local chart
helm install mbhealth ./k8s/helm/mbhealth
```

### Environment-Specific Deployments

```bash
# Development
helm install mbhealth-dev ./k8s/helm/mbhealth \
  -f ./k8s/helm/mbhealth/values-development.yaml \
  -n mbhealth-dev --create-namespace

# Staging
helm install mbhealth-staging ./k8s/helm/mbhealth \
  -f ./k8s/helm/mbhealth/values-staging.yaml \
  -n mbhealth-staging --create-namespace

# Production
helm install mbhealth-prod ./k8s/helm/mbhealth \
  -f ./k8s/helm/mbhealth/values-production.yaml \
  -n mbhealth-prod --create-namespace
```

### Custom Configuration

```bash
# Install with custom values
helm install mbhealth ./k8s/helm/mbhealth \
  --set global.domain=myhealth.company.com \
  --set backend.replicaCount=5 \
  --set postgresql.enabled=false \
  --set externalDatabase.host=db.company.com
```

## Configuration

### Global Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.environment` | Environment name | `production` |
| `global.domain` | Application domain | `mbhealth.example.com` |
| `global.imageRegistry` | Container registry | `docker.io` |
| `global.imagePullSecrets` | Image pull secrets | `[]` |
| `global.storageClass` | Storage class for PVCs | `""` |

### Backend Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.enabled` | Enable backend deployment | `true` |
| `backend.replicaCount` | Number of backend replicas | `3` |
| `backend.image.repository` | Backend image repository | `mbhealth/backend` |
| `backend.image.tag` | Backend image tag | `latest` |
| `backend.resources.limits.cpu` | CPU limit | `1000m` |
| `backend.resources.limits.memory` | Memory limit | `1Gi` |
| `backend.autoscaling.enabled` | Enable HPA | `true` |
| `backend.autoscaling.minReplicas` | Minimum replicas | `3` |
| `backend.autoscaling.maxReplicas` | Maximum replicas | `10` |

### Worker Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `worker.enabled` | Enable worker deployment | `true` |
| `worker.replicaCount` | Number of worker replicas | `2` |
| `worker.image.repository` | Worker image repository | `mbhealth/worker` |
| `worker.concurrency` | Celery worker concurrency | `4` |
| `worker.maxTasksPerChild` | Max tasks per worker child | `1000` |
| `worker.autoscaling.enabled` | Enable HPA | `true` |

### Frontend Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.enabled` | Enable frontend deployment | `true` |
| `frontend.replicaCount` | Number of frontend replicas | `2` |
| `frontend.image.repository` | Frontend image repository | `mbhealth/frontend` |
| `frontend.config.apiUrl` | API URL path | `/api/v1` |
| `frontend.config.appName` | Application name | `MBHealth` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Use bundled PostgreSQL | `true` |
| `postgresql.auth.username` | Database username | `mbhealth` |
| `postgresql.auth.database` | Database name | `mbhealth` |
| `postgresql.primary.persistence.size` | Storage size | `10Gi` |
| `externalDatabase.host` | External DB host (if postgresql.enabled=false) | `""` |
| `externalDatabase.port` | External DB port | `5432` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Use bundled Redis | `true` |
| `redis.auth.enabled` | Enable Redis auth | `true` |
| `redis.master.persistence.size` | Storage size | `2Gi` |
| `externalRedis.host` | External Redis host (if redis.enabled=false) | `""` |
| `externalRedis.port` | External Redis port | `6379` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable Ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.tls.enabled` | Enable TLS | `true` |
| `ingress.tls.secretName` | TLS secret name | `mbhealth-tls` |
| `ingress.tls.issuer.enabled` | Use cert-manager | `false` |
| `ingress.tls.issuer.name` | Cert-manager issuer | `letsencrypt-prod` |

### Security Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `networkPolicy.enabled` | Enable network policies | `true` |
| `secrets.create` | Create secrets | `true` |
| `secrets.secretKey` | Application secret key | `change-this-...` |
| `serviceAccount.create` | Create service accounts | `true` |

## Environment Variables

The application supports these environment variables:

### Backend/Worker
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - Application secret key
- `ENVIRONMENT` - Environment name (development/staging/production)
- `LOG_LEVEL` - Logging level (DEBUG/INFO/WARNING/ERROR)
- `ENABLE_AI_ANALYSIS` - Enable AI features
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)

### Frontend
- `VITE_API_URL` - API endpoint URL
- `VITE_WS_URL` - WebSocket endpoint URL
- `VITE_APP_NAME` - Application display name

## Secrets Management

### Development
For development, secrets can be stored directly in values files (not recommended for production).

### Production
For production deployments, use external secret management:

1. **Kubernetes Secrets**:
   ```bash
   kubectl create secret generic mbhealth-secret \
     --from-literal=SECRET_KEY=your-secret-key \
     --from-literal=ENCRYPTION_KEY=your-encryption-key
   ```

2. **External Secrets Operator**:
   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: mbhealth-secret
   spec:
     secretStoreRef:
       name: vault-secret-store
       kind: SecretStore
   ```

3. **Cloud Provider Secrets**:
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager

## Database Migration

Database migrations run automatically as a Helm hook before installation/upgrade:

```bash
# Check migration status
kubectl get jobs -l app.kubernetes.io/component=migration

# View migration logs
kubectl logs job/mbhealth-db-migration
```

## Monitoring and Observability

### Health Checks
- Backend: `/api/v1/health/live` and `/api/v1/health/ready`
- Frontend: `/health`
- Worker: Celery inspect ping

### Logging
All components log to stdout in structured JSON format.

### Metrics
The application exposes Prometheus metrics at `/metrics` (if enabled).

## Scaling

### Manual Scaling
```bash
# Scale backend
kubectl scale deployment mbhealth-backend --replicas=5

# Scale worker
kubectl scale deployment mbhealth-worker --replicas=3
```

### Auto Scaling
HPA is enabled by default and scales based on CPU/memory usage.

## Backup and Recovery

### Database Backup
```bash
# Create database backup
kubectl exec -it deployment/mbhealth-backend -- pg_dump $DATABASE_URL > backup.sql
```

### Persistent Volume Backup
Use your cluster's backup solution to backup PVCs.

## Troubleshooting

### Common Issues

1. **Pods not starting**:
   ```bash
   kubectl describe pod <pod-name>
   kubectl logs <pod-name>
   ```

2. **Database connection issues**:
   ```bash
   kubectl get secret mbhealth-secret -o yaml
   kubectl exec -it deployment/mbhealth-backend -- env | grep DATABASE
   ```

3. **Ingress not working**:
   ```bash
   kubectl describe ingress mbhealth-ingress
   kubectl get endpoints
   ```

### Debug Commands
```bash
# Get all resources
kubectl get all -l app.kubernetes.io/instance=mbhealth

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Port forward for testing
kubectl port-forward service/mbhealth-backend 8000:8000
kubectl port-forward service/mbhealth-frontend 8080:80
```

## Upgrading

```bash
# Upgrade to new version
helm upgrade mbhealth ./k8s/helm/mbhealth \
  --set backend.image.tag=v1.1.0 \
  --set frontend.image.tag=v1.1.0

# Rollback if needed
helm rollback mbhealth 1
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall mbhealth

# Clean up PVCs (if needed)
kubectl delete pvc -l app.kubernetes.io/instance=mbhealth
```

## Contributing

1. Make changes to templates or values
2. Validate the chart:
   ```bash
   helm lint ./k8s/helm/mbhealth
   helm template mbhealth ./k8s/helm/mbhealth | kubectl apply --dry-run=client -f -
   ```
3. Test deployment in development environment
4. Submit pull request

## Support

- Documentation: See `docs/` directory
- Issues: GitHub Issues
- API Documentation: `/docs` endpoint when deployed