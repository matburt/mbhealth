# Base Kubernetes Manifests

This directory contains the base Kubernetes manifests for deploying MBHealth.

## Structure

- **common/**: Shared resources (namespace, configmaps, secrets, ingress)
- **database/**: PostgreSQL StatefulSet and Service
- **redis/**: Redis StatefulSet and Service  
- **backend/**: Backend API Deployment, Service, HPA, and PDB
- **worker/**: Celery Worker Deployment
- **frontend/**: Frontend Deployment and Service

## Deployment Order

1. **Namespace and Config**
   ```bash
   kubectl apply -f common/namespace.yaml
   kubectl apply -f common/configmap.yaml
   kubectl apply -f common/secret.yaml  # UPDATE FIRST!
   ```

2. **Infrastructure**
   ```bash
   kubectl apply -f database/
   kubectl apply -f redis/
   ```

3. **Database Migration**
   ```bash
   kubectl apply -f common/migration-job.yaml
   kubectl wait --for=condition=complete job/mbhealth-db-migration -n mbhealth
   ```

4. **Applications**
   ```bash
   kubectl apply -f backend/
   kubectl apply -f worker/
   kubectl apply -f frontend/
   ```

5. **Ingress and Policies**
   ```bash
   kubectl apply -f common/ingress.yaml
   kubectl apply -f common/network-policies.yaml
   ```

## Important Notes

### Secrets
⚠️ **IMPORTANT**: Update `common/secret.yaml` with real values before deploying!

Required secrets:
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `DATABASE_PASSWORD`: Strong password for PostgreSQL
- `REDIS_PASSWORD`: Strong password for Redis
- `ENCRYPTION_KEY`: For data encryption (optional)

### Images
Update image tags in deployment files or use Kustomize to override:
```yaml
images:
  - name: mbhealth/backend
    newTag: v1.0.0
```

### Storage
- PostgreSQL: 10Gi PVC (adjust in `database/postgres-statefulset.yaml`)
- Redis: 2Gi PVC (adjust in `redis/redis-statefulset.yaml`)

### Scaling
- Backend: 3-10 replicas (HPA configured)
- Worker: 2-8 replicas (HPA configured)
- Frontend: 2 replicas (static)

### Monitoring
Health check endpoints:
- Backend: `/api/v1/health/live` and `/api/v1/health/ready`
- Frontend: `/health`
- Worker: Celery inspect ping

## Quick Commands

```bash
# Deploy everything
./k8s/scripts/deploy.sh

# Check status
kubectl get all -n mbhealth

# View logs
kubectl logs -f deployment/mbhealth-backend -n mbhealth
kubectl logs -f deployment/mbhealth-worker -n mbhealth

# Scale manually
kubectl scale deployment mbhealth-backend --replicas=5 -n mbhealth

# Update image
kubectl set image deployment/mbhealth-backend backend=mbhealth/backend:v1.1.0 -n mbhealth
```

## Troubleshooting

1. **Pods not starting**: Check logs and events
   ```bash
   kubectl describe pod <pod-name> -n mbhealth
   kubectl logs <pod-name> -n mbhealth
   ```

2. **Database connection issues**: Verify secrets and service names
   ```bash
   kubectl get secret mbhealth-secret -n mbhealth -o yaml
   kubectl get svc -n mbhealth
   ```

3. **Ingress not working**: Check ingress controller
   ```bash
   kubectl get ingress -n mbhealth
   kubectl describe ingress mbhealth-ingress -n mbhealth
   ```