#!/bin/bash
# Deployment script for SpotOn frontend application

set -e

# Configuration
PROJECT_NAME="spoton-frontend"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-localhost:5000}"
NAMESPACE="${NAMESPACE:-spoton}"
KUBECONFIG="${KUBECONFIG:-~/.kube/config}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
ENVIRONMENT="production"
BUILD_VERSION=""
DEPLOYMENT_TYPE="rolling"
DRY_RUN=false
SKIP_HEALTH_CHECK=false
ROLLBACK=false
FORCE_DEPLOY=false
SCALE_REPLICAS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            BUILD_VERSION="$2"
            shift 2
            ;;
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --scale)
            SCALE_REPLICAS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --environment ENV    Deployment environment (default: production)"
            echo "  -v, --version VERSION    Build version to deploy (required)"
            echo "  -t, --type TYPE          Deployment type: rolling, blue-green, canary (default: rolling)"
            echo "  --dry-run               Show what would be deployed without actually deploying"
            echo "  --skip-health-check     Skip health check after deployment"
            echo "  --rollback              Rollback to previous version"
            echo "  --force                 Force deployment even if version already deployed"
            echo "  --scale REPLICAS        Scale to specified number of replicas"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$BUILD_VERSION" ] && [ "$ROLLBACK" != true ]; then
    log_error "Build version is required. Use -v or --version to specify."
    exit 1
fi

# Set environment-specific configurations
case $ENVIRONMENT in
    "development")
        NAMESPACE="spoton-dev"
        REPLICAS=${SCALE_REPLICAS:-1}
        RESOURCE_LIMITS="cpu=200m,memory=256Mi"
        RESOURCE_REQUESTS="cpu=100m,memory=128Mi"
        ;;
    "staging")
        NAMESPACE="spoton-staging"
        REPLICAS=${SCALE_REPLICAS:-2}
        RESOURCE_LIMITS="cpu=500m,memory=512Mi"
        RESOURCE_REQUESTS="cpu=200m,memory=256Mi"
        ;;
    "production")
        NAMESPACE="spoton-prod"
        REPLICAS=${SCALE_REPLICAS:-3}
        RESOURCE_LIMITS="cpu=1000m,memory=1Gi"
        RESOURCE_REQUESTS="cpu=500m,memory=512Mi"
        ;;
    *)
        log_error "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

log_info "Starting deployment process..."
log_info "Environment: $ENVIRONMENT"
log_info "Namespace: $NAMESPACE"
log_info "Version: $BUILD_VERSION"
log_info "Deployment Type: $DEPLOYMENT_TYPE"
log_info "Replicas: $REPLICAS"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if image exists
    if [ "$ROLLBACK" != true ]; then
        IMAGE_NAME="${DOCKER_REGISTRY}/${PROJECT_NAME}:${BUILD_VERSION}"
        if ! docker manifest inspect $IMAGE_NAME &> /dev/null; then
            log_error "Docker image not found: $IMAGE_NAME"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace if it doesn't exist
create_namespace() {
    log_info "Creating namespace if it doesn't exist..."
    
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would create namespace: $NAMESPACE"
        else
            kubectl create namespace $NAMESPACE
            log_success "Namespace created: $NAMESPACE"
        fi
    else
        log_info "Namespace already exists: $NAMESPACE"
    fi
}

# Generate deployment manifest
generate_deployment_manifest() {
    log_info "Generating deployment manifest..."
    
    cat > deployment-manifest.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spoton-frontend
  namespace: $NAMESPACE
  labels:
    app: spoton-frontend
    version: $BUILD_VERSION
    environment: $ENVIRONMENT
spec:
  replicas: $REPLICAS
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: spoton-frontend
  template:
    metadata:
      labels:
        app: spoton-frontend
        version: $BUILD_VERSION
        environment: $ENVIRONMENT
    spec:
      containers:
      - name: frontend
        image: ${DOCKER_REGISTRY}/${PROJECT_NAME}:${BUILD_VERSION}
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: REACT_APP_VERSION
          value: "$BUILD_VERSION"
        - name: REACT_APP_ENVIRONMENT
          value: "$ENVIRONMENT"
        resources:
          requests:
            memory: "$(echo $RESOURCE_REQUESTS | cut -d',' -f2 | cut -d'=' -f2)"
            cpu: "$(echo $RESOURCE_REQUESTS | cut -d',' -f1 | cut -d'=' -f2)"
          limits:
            memory: "$(echo $RESOURCE_LIMITS | cut -d',' -f2 | cut -d'=' -f2)"
            cpu: "$(echo $RESOURCE_LIMITS | cut -d',' -f1 | cut -d'=' -f2)"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: var-run
          mountPath: /var/run
        - name: var-cache-nginx
          mountPath: /var/cache/nginx
      volumes:
      - name: tmp
        emptyDir: {}
      - name: var-run
        emptyDir: {}
      - name: var-cache-nginx
        emptyDir: {}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
---
apiVersion: v1
kind: Service
metadata:
  name: spoton-frontend-service
  namespace: $NAMESPACE
  labels:
    app: spoton-frontend
spec:
  selector:
    app: spoton-frontend
  ports:
  - port: 80
    targetPort: 8080
    name: http
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spoton-frontend-ingress
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - spoton-$ENVIRONMENT.company.com
    secretName: spoton-frontend-tls
  rules:
  - host: spoton-$ENVIRONMENT.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: spoton-frontend-service
            port:
              number: 80
EOF

    log_success "Deployment manifest generated"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would apply deployment manifest"
        kubectl apply -f deployment-manifest.yaml --dry-run=client
    else
        kubectl apply -f deployment-manifest.yaml
        log_success "Deployment manifest applied"
    fi
}

# Wait for deployment to complete
wait_for_deployment() {
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would wait for deployment to complete"
        return 0
    fi
    
    log_info "Waiting for deployment to complete..."
    
    if kubectl rollout status deployment/spoton-frontend -n $NAMESPACE --timeout=600s; then
        log_success "Deployment completed successfully"
    else
        log_error "Deployment failed or timed out"
        return 1
    fi
}

# Health check
health_check() {
    if [ "$SKIP_HEALTH_CHECK" = true ] || [ "$DRY_RUN" = true ]; then
        log_info "Skipping health check"
        return 0
    fi
    
    log_info "Performing health check..."
    
    # Get pod name
    POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=spoton-frontend -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD_NAME" ]; then
        log_error "No pods found"
        return 1
    fi
    
    # Check pod status
    POD_STATUS=$(kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.status.phase}')
    
    if [ "$POD_STATUS" != "Running" ]; then
        log_error "Pod is not running. Status: $POD_STATUS"
        return 1
    fi
    
    # Check health endpoint
    if kubectl exec $POD_NAME -n $NAMESPACE -- curl -f http://localhost:8080/health; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    log_info "Rolling back deployment..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would rollback deployment"
        return 0
    fi
    
    if kubectl rollout undo deployment/spoton-frontend -n $NAMESPACE; then
        log_success "Rollback initiated"
        wait_for_deployment
    else
        log_error "Rollback failed"
        return 1
    fi
}

# Scale deployment
scale_deployment() {
    if [ -n "$SCALE_REPLICAS" ]; then
        log_info "Scaling deployment to $SCALE_REPLICAS replicas..."
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would scale deployment to $SCALE_REPLICAS replicas"
        else
            kubectl scale deployment/spoton-frontend -n $NAMESPACE --replicas=$SCALE_REPLICAS
            log_success "Deployment scaled to $SCALE_REPLICAS replicas"
        fi
    fi
}

# Get deployment status
get_deployment_status() {
    log_info "Getting deployment status..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would get deployment status"
        return 0
    fi
    
    echo "Deployment Status:"
    kubectl get deployment spoton-frontend -n $NAMESPACE -o wide
    
    echo ""
    echo "Pods:"
    kubectl get pods -n $NAMESPACE -l app=spoton-frontend -o wide
    
    echo ""
    echo "Services:"
    kubectl get services -n $NAMESPACE -l app=spoton-frontend
    
    echo ""
    echo "Ingress:"
    kubectl get ingress -n $NAMESPACE
}

# Cleanup
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f deployment-manifest.yaml
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    create_namespace
    
    if [ "$ROLLBACK" = true ]; then
        rollback_deployment
    else
        generate_deployment_manifest
        deploy_application
        wait_for_deployment
        health_check
    fi
    
    scale_deployment
    get_deployment_status
    
    log_success "Deployment process completed successfully!"
    
    if [ "$DRY_RUN" != true ]; then
        log_info "Application URL: https://spoton-$ENVIRONMENT.company.com"
    fi
}

# Run main function
main