#!/bin/bash
# Build script for SpotOn frontend application

set -e

# Configuration
PROJECT_NAME="spoton-frontend"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-localhost:5000}"
BUILD_DIR="build"
DIST_DIR="dist"

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
PUSH_IMAGE=false
CLEAN_BUILD=false
SKIP_TESTS=false
SKIP_LINT=false
ANALYZE_BUNDLE=false
DOCKER_BUILD=false

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
        -p|--push)
            PUSH_IMAGE=true
            shift
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --analyze)
            ANALYZE_BUNDLE=true
            shift
            ;;
        --docker)
            DOCKER_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --environment ENV    Build environment (default: production)"
            echo "  -v, --version VERSION    Build version (default: auto-generated)"
            echo "  -p, --push              Push Docker image to registry"
            echo "  -c, --clean             Clean build (remove node_modules and build dirs)"
            echo "  --skip-tests            Skip running tests"
            echo "  --skip-lint             Skip linting"
            echo "  --analyze               Analyze bundle size"
            echo "  --docker                Build Docker image"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Generate build metadata
if [ -z "$BUILD_VERSION" ]; then
    BUILD_VERSION=$(date +"%Y%m%d%H%M%S")
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_HASH=$(git rev-parse --short HEAD)
        BUILD_VERSION="${BUILD_VERSION}-${GIT_HASH}"
    fi
fi

BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
BUILD_ID="${BUILD_VERSION}-$(date +%s)"

log_info "Starting build process..."
log_info "Environment: $ENVIRONMENT"
log_info "Version: $BUILD_VERSION"
log_info "Build Date: $BUILD_DATE"
log_info "Commit Hash: $COMMIT_HASH"
log_info "Build ID: $BUILD_ID"

# Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    log_info "Cleaning previous build..."
    rm -rf node_modules
    rm -rf $BUILD_DIR
    rm -rf $DIST_DIR
    rm -rf yarn.lock
    log_success "Clean completed"
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
log_info "Installing dependencies..."
if command -v yarn &> /dev/null; then
    yarn install --frozen-lockfile
else
    npm ci
fi
log_success "Dependencies installed"

# Run linting
if [ "$SKIP_LINT" != true ]; then
    log_info "Running linting..."
    if command -v yarn &> /dev/null; then
        yarn lint
    else
        npm run lint
    fi
    log_success "Linting passed"
fi

# Run tests
if [ "$SKIP_TESTS" != true ]; then
    log_info "Running tests..."
    if command -v yarn &> /dev/null; then
        yarn test --coverage --watchAll=false
    else
        npm run test -- --coverage --watchAll=false
    fi
    log_success "Tests passed"
fi

# Set environment variables for build
export NODE_ENV=$ENVIRONMENT
export REACT_APP_VERSION=$BUILD_VERSION
export REACT_APP_BUILD_DATE=$BUILD_DATE
export REACT_APP_COMMIT_HASH=$COMMIT_HASH
export REACT_APP_BUILD_ID=$BUILD_ID
export REACT_APP_ENVIRONMENT=$ENVIRONMENT

# Build the application
log_info "Building application..."
if command -v yarn &> /dev/null; then
    yarn build
else
    npm run build
fi
log_success "Build completed"

# Optimize build output
log_info "Optimizing build output..."
if [ -d "$BUILD_DIR" ]; then
    # Remove source maps in production
    if [ "$ENVIRONMENT" = "production" ]; then
        find $BUILD_DIR -name "*.map" -delete
        log_info "Source maps removed"
    fi
    
    # Compress assets
    if command -v gzip &> /dev/null; then
        find $BUILD_DIR -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -9 -c {} \; > {}.gz
        log_info "Assets compressed"
    fi
    
    # Generate build manifest
    cat > $BUILD_DIR/build-info.json << EOF
{
  "version": "$BUILD_VERSION",
  "buildDate": "$BUILD_DATE",
  "commitHash": "$COMMIT_HASH",
  "buildId": "$BUILD_ID",
  "environment": "$ENVIRONMENT",
  "nodeVersion": "$(node --version)",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    log_info "Build manifest generated"
fi

# Analyze bundle size
if [ "$ANALYZE_BUNDLE" = true ]; then
    log_info "Analyzing bundle size..."
    if command -v yarn &> /dev/null; then
        yarn analyze
    else
        npm run analyze
    fi
fi

# Build Docker image
if [ "$DOCKER_BUILD" = true ]; then
    log_info "Building Docker image..."
    
    IMAGE_NAME="${DOCKER_REGISTRY}/${PROJECT_NAME}:${BUILD_VERSION}"
    LATEST_IMAGE="${DOCKER_REGISTRY}/${PROJECT_NAME}:latest"
    
    docker build \
        -f docker/Dockerfile \
        --build-arg BUILD_VERSION=$BUILD_VERSION \
        --build-arg BUILD_DATE=$BUILD_DATE \
        --build-arg COMMIT_HASH=$COMMIT_HASH \
        --build-arg BUILD_ID=$BUILD_ID \
        -t $IMAGE_NAME \
        -t $LATEST_IMAGE \
        .
    
    log_success "Docker image built: $IMAGE_NAME"
    
    # Push image if requested
    if [ "$PUSH_IMAGE" = true ]; then
        log_info "Pushing Docker image..."
        docker push $IMAGE_NAME
        docker push $LATEST_IMAGE
        log_success "Docker image pushed"
    fi
fi

# Generate deployment artifacts
log_info "Generating deployment artifacts..."
mkdir -p $DIST_DIR

# Copy build output
cp -r $BUILD_DIR/* $DIST_DIR/

# Generate deployment manifest
cat > $DIST_DIR/deployment-manifest.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spoton-frontend
  labels:
    app: spoton-frontend
    version: $BUILD_VERSION
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spoton-frontend
  template:
    metadata:
      labels:
        app: spoton-frontend
        version: $BUILD_VERSION
    spec:
      containers:
      - name: frontend
        image: ${DOCKER_REGISTRY}/${PROJECT_NAME}:${BUILD_VERSION}
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: REACT_APP_VERSION
          value: "$BUILD_VERSION"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: spoton-frontend-service
spec:
  selector:
    app: spoton-frontend
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
EOF

log_success "Deployment artifacts generated"

# Generate build report
log_info "Generating build report..."
BUILD_SIZE=$(du -sh $BUILD_DIR | cut -f1)
JS_SIZE=$(find $BUILD_DIR -name "*.js" -exec du -ch {} + | grep total | cut -f1)
CSS_SIZE=$(find $BUILD_DIR -name "*.css" -exec du -ch {} + | grep total | cut -f1)

cat > build-report.txt << EOF
SpotOn Frontend Build Report
============================

Build Information:
- Version: $BUILD_VERSION
- Environment: $ENVIRONMENT
- Build Date: $BUILD_DATE
- Commit Hash: $COMMIT_HASH
- Build ID: $BUILD_ID

Build Statistics:
- Total Build Size: $BUILD_SIZE
- JavaScript Size: $JS_SIZE
- CSS Size: $CSS_SIZE
- Build Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Build Artifacts:
- Build Directory: $BUILD_DIR
- Distribution Directory: $DIST_DIR
- Docker Image: ${DOCKER_REGISTRY}/${PROJECT_NAME}:${BUILD_VERSION}

Build Options:
- Skip Tests: $SKIP_TESTS
- Skip Lint: $SKIP_LINT
- Analyze Bundle: $ANALYZE_BUNDLE
- Docker Build: $DOCKER_BUILD
- Push Image: $PUSH_IMAGE
- Clean Build: $CLEAN_BUILD
EOF

log_success "Build report generated: build-report.txt"

# Final summary
log_success "Build completed successfully!"
log_info "Build version: $BUILD_VERSION"
log_info "Build artifacts available in: $DIST_DIR"

if [ "$DOCKER_BUILD" = true ]; then
    log_info "Docker image: ${DOCKER_REGISTRY}/${PROJECT_NAME}:${BUILD_VERSION}"
fi

log_info "Build report: build-report.txt"