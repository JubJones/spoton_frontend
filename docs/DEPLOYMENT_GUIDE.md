# Deployment Guide

This guide provides comprehensive instructions for deploying the SpotOn Frontend application in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Observability](#monitoring--observability)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Docker**: >= 20.0.0 (for containerized deployment)
- **Kubernetes**: >= 1.20.0 (for K8s deployment)
- **Git**: >= 2.30.0

### Development Tools

- **IDE**: VS Code or similar
- **Browser**: Chrome, Firefox, Safari, Edge
- **Terminal**: Bash, Zsh, or PowerShell

## Environment Configuration

### Environment Variables

Create environment-specific configuration files:

#### `.env.development`
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001

# Authentication
REACT_APP_AUTH_DOMAIN=dev-auth.spoton.com
REACT_APP_CLIENT_ID=dev-client-id

# Monitoring
REACT_APP_MONITORING_ENDPOINT=http://localhost:3002
REACT_APP_LOG_LEVEL=debug

# Features
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_WEBSOCKETS=true
REACT_APP_ENABLE_PWA=false
```

#### `.env.staging`
```bash
# API Configuration
REACT_APP_API_URL=https://api-staging.spoton.com
REACT_APP_WS_URL=wss://api-staging.spoton.com

# Authentication
REACT_APP_AUTH_DOMAIN=staging-auth.spoton.com
REACT_APP_CLIENT_ID=staging-client-id

# Monitoring
REACT_APP_MONITORING_ENDPOINT=https://monitoring-staging.spoton.com
REACT_APP_LOG_LEVEL=info

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_WEBSOCKETS=true
REACT_APP_ENABLE_PWA=true
```

#### `.env.production`
```bash
# API Configuration
REACT_APP_API_URL=https://api.spoton.com
REACT_APP_WS_URL=wss://api.spoton.com

# Authentication
REACT_APP_AUTH_DOMAIN=auth.spoton.com
REACT_APP_CLIENT_ID=prod-client-id

# Monitoring
REACT_APP_MONITORING_ENDPOINT=https://monitoring.spoton.com
REACT_APP_LOG_LEVEL=warn

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_WEBSOCKETS=true
REACT_APP_ENABLE_PWA=true

# Security
REACT_APP_ENABLE_CSP=true
REACT_APP_ENABLE_HTTPS_REDIRECT=true
```

### Build Configuration

#### `package.json` Scripts
```json
{
  "scripts": {
    "dev": "react-scripts start",
    "build": "react-scripts build",
    "build:staging": "env-cmd -f .env.staging npm run build",
    "build:production": "env-cmd -f .env.production npm run build",
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js"
  }
}
```

## Local Development

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/spoton/spoton-frontend.git
   cd spoton-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your local settings
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000 in your browser
   - The app will automatically reload on file changes

### Development Workflow

```bash
# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check

# Build for production
npm run build

# Analyze bundle size
npm run analyze
```

## Docker Deployment

### Single Container Deployment

1. **Build the Docker image**
   ```bash
   docker build -f docker/Dockerfile -t spoton-frontend:latest .
   ```

2. **Run the container**
   ```bash
   docker run -d \
     --name spoton-frontend \
     -p 80:80 \
     -e REACT_APP_API_URL=https://api.spoton.com \
     spoton-frontend:latest
   ```

### Docker Compose Deployment

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     frontend:
       build:
         context: .
         dockerfile: docker/Dockerfile
       ports:
         - "80:80"
       environment:
         - REACT_APP_API_URL=https://api.spoton.com
         - REACT_APP_WS_URL=wss://api.spoton.com
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf:ro
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Multi-Environment Setup

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Staging
docker-compose -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Kubernetes Deployment

### Basic Kubernetes Manifests

#### 1. ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spoton-frontend-config
data:
  REACT_APP_API_URL: "https://api.spoton.com"
  REACT_APP_WS_URL: "wss://api.spoton.com"
  REACT_APP_LOG_LEVEL: "info"
```

#### 2. Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spoton-frontend
  labels:
    app: spoton-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spoton-frontend
  template:
    metadata:
      labels:
        app: spoton-frontend
    spec:
      containers:
      - name: frontend
        image: spoton-frontend:latest
        ports:
        - containerPort: 80
        envFrom:
        - configMapRef:
            name: spoton-frontend-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 3. Service
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: spoton-frontend-service
spec:
  selector:
    app: spoton-frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

#### 4. Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spoton-frontend-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - spoton.com
    secretName: spoton-frontend-tls
  rules:
  - host: spoton.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: spoton-frontend-service
            port:
              number: 80
```

### Deployment Commands

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/spoton-frontend

# Scale deployment
kubectl scale deployment spoton-frontend --replicas=5

# Rolling update
kubectl set image deployment/spoton-frontend frontend=spoton-frontend:v2.0.0
```

### Helm Chart Deployment

1. **Create Helm chart**
   ```bash
   helm create spoton-frontend-chart
   ```

2. **Install with Helm**
   ```bash
   helm install spoton-frontend ./spoton-frontend-chart \
     --set image.tag=latest \
     --set replicaCount=3 \
     --set ingress.enabled=true \
     --set ingress.hosts[0].host=spoton.com
   ```

3. **Upgrade deployment**
   ```bash
   helm upgrade spoton-frontend ./spoton-frontend-chart \
     --set image.tag=v2.0.0
   ```

## Cloud Deployment

### AWS Deployment

#### Using AWS ECS

1. **Create ECS Task Definition**
   ```json
   {
     "family": "spoton-frontend",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "frontend",
         "image": "account.dkr.ecr.region.amazonaws.com/spoton-frontend:latest",
         "portMappings": [
           {
             "containerPort": 80,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "REACT_APP_API_URL",
             "value": "https://api.spoton.com"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/spoton-frontend",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

2. **Create ECS Service**
   ```bash
   aws ecs create-service \
     --cluster spoton-cluster \
     --service-name spoton-frontend \
     --task-definition spoton-frontend \
     --desired-count 3 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
   ```

#### Using AWS Amplify

1. **Install Amplify CLI**
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

2. **Initialize Amplify**
   ```bash
   amplify init
   ```

3. **Deploy to Amplify**
   ```bash
   amplify publish
   ```

### Google Cloud Deployment

#### Using Google Cloud Run

1. **Build and push image**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/spoton-frontend
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy spoton-frontend \
     --image gcr.io/PROJECT_ID/spoton-frontend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Azure Deployment

#### Using Azure Container Instances

1. **Create resource group**
   ```bash
   az group create --name spoton-rg --location eastus
   ```

2. **Deploy container**
   ```bash
   az container create \
     --resource-group spoton-rg \
     --name spoton-frontend \
     --image spoton-frontend:latest \
     --ports 80 \
     --environment-variables REACT_APP_API_URL=https://api.spoton.com
   ```

## CI/CD Pipeline

### GitHub Actions

The CI/CD pipeline is configured in `.github/workflows/ci-cd.yml`:

#### Pipeline Stages

1. **Code Quality**
   - ESLint and Prettier checks
   - TypeScript compilation
   - Unit tests with coverage

2. **Security**
   - Dependency vulnerability scanning
   - Security audit
   - SAST analysis

3. **Build**
   - Production build
   - Docker image creation
   - Bundle analysis

4. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests with Playwright

5. **Deployment**
   - Development environment (auto-deploy on main branch)
   - Staging environment (auto-deploy on release branches)
   - Production environment (manual approval required)

#### Workflow Triggers

```yaml
on:
  push:
    branches: [ main, develop, 'release/*' ]
  pull_request:
    branches: [ main, develop ]
  release:
    types: [ published ]
```

#### Environment-Specific Deployments

```yaml
jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/main'
    environment: development
    
  deploy-staging:
    if: startsWith(github.ref, 'refs/heads/release/')
    environment: staging
    
  deploy-prod:
    if: github.event_name == 'release'
    environment: production
    needs: [deploy-staging]
```

### GitLab CI/CD

Example `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:18-alpine
  script:
    - npm ci
    - npm run lint
    - npm run type-check
    - npm run test:coverage
  artifacts:
    reports:
      coverage: coverage/clover.xml
    paths:
      - coverage/

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:production:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/spoton-frontend frontend=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
```

## Monitoring & Observability

### Health Checks

#### Application Health Endpoint
```javascript
// src/health.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
```

#### Readiness Probe
```javascript
app.get('/ready', (req, res) => {
  // Check dependencies
  const isReady = checkDependencies();
  
  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});
```

### Monitoring Setup

#### Prometheus Metrics
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'spoton-frontend'
    static_configs:
      - targets: ['spoton-frontend:80']
    metrics_path: '/metrics'
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "SpotOn Frontend",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

### Logging Configuration

#### Structured Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});
```

#### Log Aggregation
```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/spoton-frontend/*.log
  fields:
    service: spoton-frontend
    environment: production

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "spoton-frontend-%{+yyyy.MM.dd}"
```

## Security Considerations

### SSL/TLS Configuration

#### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name spoton.com;
    
    ssl_certificate /etc/ssl/certs/spoton.com.crt;
    ssl_certificate_key /etc/ssl/private/spoton.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Security Headers

#### Content Security Policy
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
```

### Environment Security

#### Secret Management
```bash
# Kubernetes secrets
kubectl create secret generic spoton-frontend-secrets \
  --from-literal=api-key=your-api-key \
  --from-literal=db-password=your-db-password
```

#### Network Security
```yaml
# NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: spoton-frontend-netpol
spec:
  podSelector:
    matchLabels:
      app: spoton-frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80
```

## Troubleshooting

### Common Issues

#### Build Failures

1. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

2. **TypeScript Errors**
   ```bash
   # Check TypeScript configuration
   npm run type-check
   
   # Fix linting issues
   npm run lint:fix
   ```

3. **Dependency Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Remove node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

#### Deployment Issues

1. **Container Startup Failures**
   ```bash
   # Check container logs
   docker logs spoton-frontend
   
   # Debug container
   docker run -it --entrypoint /bin/sh spoton-frontend:latest
   ```

2. **Kubernetes Issues**
   ```bash
   # Check pod status
   kubectl get pods
   kubectl describe pod <pod-name>
   
   # Check logs
   kubectl logs <pod-name>
   
   # Debug networking
   kubectl exec -it <pod-name> -- nslookup <service-name>
   ```

3. **Performance Issues**
   ```bash
   # Analyze bundle size
   npm run analyze
   
   # Check memory usage
   kubectl top pods
   
   # Monitor resource usage
   kubectl get --raw /metrics
   ```

### Debugging Tools

#### Development Tools
```bash
# React Developer Tools
npm install -g react-devtools

# Bundle analyzer
npm install -g webpack-bundle-analyzer

# Performance profiling
npm install -g clinic
```

#### Production Debugging
```bash
# Check application health
curl -f http://localhost/health

# Monitor logs
tail -f /var/log/spoton-frontend/app.log

# Check resource usage
top -p $(pgrep -f spoton-frontend)
```

### Recovery Procedures

#### Rollback Deployment
```bash
# Kubernetes rollback
kubectl rollout undo deployment/spoton-frontend

# Docker rollback
docker service update --image spoton-frontend:previous spoton-frontend

# Helm rollback
helm rollback spoton-frontend 1
```

#### Emergency Procedures
```bash
# Scale down deployment
kubectl scale deployment spoton-frontend --replicas=0

# Enable maintenance mode
kubectl patch ingress spoton-frontend-ingress -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/configuration-snippet":"return 503;"}}}'

# Emergency restart
kubectl delete pods -l app=spoton-frontend
```

## Best Practices

### Deployment Best Practices

1. **Use Blue-Green Deployments**
2. **Implement Canary Releases**
3. **Monitor Deployment Health**
4. **Maintain Rollback Capabilities**
5. **Use Infrastructure as Code**
6. **Implement Automated Testing**
7. **Monitor Security Vulnerabilities**
8. **Regular Backup and Recovery Testing**

### Performance Best Practices

1. **Optimize Bundle Size**
2. **Use CDN for Static Assets**
3. **Implement Caching Strategies**
4. **Monitor Core Web Vitals**
5. **Use Performance Budgets**
6. **Implement Progressive Loading**

### Security Best Practices

1. **Regular Security Audits**
2. **Automated Vulnerability Scanning**
3. **Implement Security Headers**
4. **Use Secrets Management**
5. **Network Security Policies**
6. **Regular Security Updates**

This deployment guide provides comprehensive instructions for deploying the SpotOn Frontend application across various environments and platforms. Follow the appropriate sections based on your deployment target and requirements.