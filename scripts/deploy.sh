#!/bin/bash

# SpotOn Frontend Deployment Script
# Automated deployment with health checks and rollback capability

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/dist"
BACKUP_DIR="/var/backups/spoton-frontend"
DEPLOY_DIR="/var/www/spoton-frontend"
LOG_FILE="/var/log/spoton-frontend-deploy.log"
MAX_BACKUPS=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. Consider using a dedicated deployment user."
    fi
    
    # Check write permissions to deployment directory
    if [[ ! -w "$(dirname "$DEPLOY_DIR")" ]]; then
        error "No write permission to deployment directory parent: $(dirname "$DEPLOY_DIR")"
        exit 1
    fi
}

# Validate environment
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required commands
    local required_commands=("node" "npm" "rsync" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    
    if ! npx semver "$node_version" -r ">=$required_version" &> /dev/null; then
        error "Node.js version $node_version is too old. Required: >=$required_version"
        exit 1
    fi
    
    # Check available disk space (require at least 1GB free)
    local available_space
    available_space=$(df "$DEPLOY_DIR" 2>/dev/null | tail -1 | awk '{print $4}' || echo "0")
    if [[ $available_space -lt 1048576 ]]; then # 1GB in KB
        error "Insufficient disk space. Available: ${available_space}KB, Required: 1GB"
        exit 1
    fi
    
    success "Environment validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if project directory exists
    if [[ ! -d "$PROJECT_DIR" ]]; then
        error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    # Check if package.json exists
    if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
        error "package.json not found in project directory"
        exit 1
    fi
    
    # Validate environment variables
    local required_env_vars=("VITE_API_BASE_URL" "VITE_WS_BASE_URL" "VITE_ENVIRONMENT")
    for var in "${required_env_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    log "Environment variables:"
    log "  VITE_API_BASE_URL: ${VITE_API_BASE_URL}"
    log "  VITE_WS_BASE_URL: ${VITE_WS_BASE_URL}"
    log "  VITE_ENVIRONMENT: ${VITE_ENVIRONMENT}"
    
    success "Pre-deployment checks passed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Clean install to ensure consistency
    if [[ -d "node_modules" ]]; then
        log "Removing existing node_modules..."
        rm -rf node_modules
    fi
    
    if [[ -f "package-lock.json" ]]; then
        npm ci --only=production --silent
    else
        npm install --only=production --silent
    fi
    
    success "Dependencies installed"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    cd "$PROJECT_DIR"
    
    # Install dev dependencies for testing
    npm ci --silent
    
    # Run linting
    if npm run lint --silent; then
        success "Linting passed"
    else
        error "Linting failed"
        exit 1
    fi
    
    # Run type checking
    if npm run type-check --silent; then
        success "Type checking passed"
    else
        error "Type checking failed"
        exit 1
    fi
    
    # Run unit tests
    if npm test -- --run --coverage --silent; then
        success "Unit tests passed"
    else
        error "Unit tests failed"
        exit 1
    fi
    
    success "All tests passed"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$PROJECT_DIR"
    
    # Set build timestamp
    export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    export VITE_BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Build the application
    if npm run build; then
        success "Application built successfully"
    else
        error "Build failed"
        exit 1
    fi
    
    # Verify build output
    if [[ ! -d "$BUILD_DIR" ]]; then
        error "Build directory not found: $BUILD_DIR"
        exit 1
    fi
    
    if [[ ! -f "$BUILD_DIR/index.html" ]]; then
        error "index.html not found in build directory"
        exit 1
    fi
    
    # Display build size
    local build_size
    build_size=$(du -sh "$BUILD_DIR" | cut -f1)
    log "Build size: $build_size"
    
    success "Build completed"
}

# Create backup of current deployment
create_backup() {
    log "Creating backup of current deployment..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create timestamped backup
    local backup_name="spoton-frontend-$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [[ -d "$DEPLOY_DIR" ]]; then
        # Create backup
        if cp -r "$DEPLOY_DIR" "$backup_path"; then
            success "Backup created: $backup_path"
            echo "$backup_path" > "$BACKUP_DIR/.latest_backup"
        else
            warning "Failed to create backup, continuing with deployment"
        fi
        
        # Clean up old backups (keep only MAX_BACKUPS)
        local backup_count
        backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "spoton-frontend-*" | wc -l)
        if [[ $backup_count -gt $MAX_BACKUPS ]]; then
            log "Cleaning up old backups (keeping $MAX_BACKUPS most recent)..."
            find "$BACKUP_DIR" -maxdepth 1 -type d -name "spoton-frontend-*" -printf '%T@ %p\n' | \
                sort -n | head -n -"$MAX_BACKUPS" | cut -d' ' -f2- | xargs rm -rf
        fi
    else
        log "No existing deployment found, skipping backup"
    fi
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Create deployment directory if it doesn't exist
    mkdir -p "$DEPLOY_DIR"
    
    # Deploy using rsync for efficiency
    if rsync -av --delete "$BUILD_DIR/" "$DEPLOY_DIR/"; then
        success "Application deployed to $DEPLOY_DIR"
    else
        error "Deployment failed"
        
        # Attempt rollback
        rollback_deployment
        exit 1
    fi
    
    # Set appropriate permissions
    find "$DEPLOY_DIR" -type f -exec chmod 644 {} \;
    find "$DEPLOY_DIR" -type d -exec chmod 755 {} \;
    
    # Create deployment info file
    cat > "$DEPLOY_DIR/.deployment-info.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "${VITE_BUILD_COMMIT:-unknown}",
  "environment": "${VITE_ENVIRONMENT:-unknown}",
  "version": "${VITE_APP_VERSION:-unknown}",
  "deployed_by": "${USER:-unknown}",
  "build_size": "$(du -sh "$BUILD_DIR" | cut -f1)"
}
EOF
    
    success "Deployment completed"
}

# Health check
health_check() {
    log "Running post-deployment health checks..."
    
    # Check if index.html exists and is readable
    if [[ ! -r "$DEPLOY_DIR/index.html" ]]; then
        error "index.html is not readable in deployment directory"
        return 1
    fi
    
    # Check if assets directory exists
    if [[ ! -d "$DEPLOY_DIR/assets" ]]; then
        error "Assets directory not found in deployment"
        return 1
    fi
    
    # If we have a web server running, test HTTP response
    local health_url="${HEALTH_CHECK_URL:-}"
    if [[ -n "$health_url" ]]; then
        log "Checking application health at: $health_url"
        
        local max_attempts=12  # 2 minutes with 10-second intervals
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f -s -o /dev/null "$health_url"; then
                success "Health check passed"
                return 0
            else
                log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
                sleep 10
                ((attempt++))
            fi
        done
        
        error "Health check failed after $max_attempts attempts"
        return 1
    else
        log "No health check URL provided, skipping HTTP health check"
    fi
    
    success "Basic health checks passed"
    return 0
}

# Rollback deployment
rollback_deployment() {
    warning "Starting rollback procedure..."
    
    local latest_backup_file="$BACKUP_DIR/.latest_backup"
    
    if [[ -f "$latest_backup_file" ]]; then
        local latest_backup
        latest_backup=$(cat "$latest_backup_file")
        
        if [[ -d "$latest_backup" ]]; then
            log "Rolling back to: $latest_backup"
            
            # Remove current deployment
            rm -rf "$DEPLOY_DIR"
            
            # Restore from backup
            if cp -r "$latest_backup" "$DEPLOY_DIR"; then
                success "Rollback completed successfully"
            else
                error "Rollback failed"
                exit 1
            fi
        else
            error "Backup directory not found: $latest_backup"
            exit 1
        fi
    else
        error "No backup available for rollback"
        exit 1
    fi
}

# Restart web server (if specified)
restart_web_server() {
    if [[ -n "${WEB_SERVER_SERVICE:-}" ]]; then
        log "Restarting web server: $WEB_SERVER_SERVICE"
        
        if systemctl is-active --quiet "$WEB_SERVER_SERVICE"; then
            if systemctl reload "$WEB_SERVER_SERVICE"; then
                success "Web server reloaded successfully"
            else
                warning "Web server reload failed, attempting restart..."
                if systemctl restart "$WEB_SERVER_SERVICE"; then
                    success "Web server restarted successfully"
                else
                    error "Web server restart failed"
                    return 1
                fi
            fi
        else
            log "Web server is not running, starting it..."
            if systemctl start "$WEB_SERVER_SERVICE"; then
                success "Web server started successfully"
            else
                error "Web server start failed"
                return 1
            fi
        fi
    else
        log "No web server service specified, skipping restart"
    fi
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" != "success" ]]; then
            color="danger"
        fi
        
        local payload=$(cat << EOF
{
  "channel": "#deployments",
  "username": "SpotOn Deployment Bot",
  "attachments": [
    {
      "color": "$color",
      "title": "SpotOn Frontend Deployment",
      "fields": [
        {
          "title": "Status",
          "value": "$status",
          "short": true
        },
        {
          "title": "Environment",
          "value": "${VITE_ENVIRONMENT:-unknown}",
          "short": true
        },
        {
          "title": "Commit",
          "value": "${VITE_BUILD_COMMIT:-unknown}",
          "short": true
        },
        {
          "title": "User",
          "value": "${USER:-unknown}",
          "short": true
        },
        {
          "title": "Message",
          "value": "$message",
          "short": false
        }
      ],
      "ts": $(date +%s)
    }
  ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
}

# Cleanup temporary files
cleanup() {
    log "Cleaning up temporary files..."
    
    # Remove build artifacts from project directory
    cd "$PROJECT_DIR"
    
    # Clean node_modules if they were installed for testing
    if [[ "${CLEAN_NODE_MODULES:-false}" == "true" ]]; then
        rm -rf node_modules
    fi
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    local start_time
    start_time=$(date +%s)
    
    log "=== Starting SpotOn Frontend Deployment ==="
    log "Deployment started at: $(date)"
    log "Target directory: $DEPLOY_DIR"
    log "Environment: ${VITE_ENVIRONMENT:-unknown}"
    
    # Trap errors and cleanup
    trap 'error "Deployment failed"; send_notification "failed" "Deployment failed with error"; cleanup; exit 1' ERR
    
    # Run deployment steps
    check_permissions
    validate_environment
    pre_deployment_checks
    install_dependencies
    
    # Only run tests in non-production environments or if explicitly requested
    if [[ "${VITE_ENVIRONMENT}" != "production" ]] || [[ "${RUN_TESTS:-false}" == "true" ]]; then
        run_tests
    else
        log "Skipping tests for production deployment"
    fi
    
    build_application
    create_backup
    deploy_application
    
    # Run health checks
    if health_check; then
        restart_web_server
        
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        success "=== Deployment completed successfully ==="
        success "Deployment duration: ${duration}s"
        
        send_notification "success" "Deployment completed successfully in ${duration}s"
        
        cleanup
    else
        error "Health checks failed, initiating rollback..."
        rollback_deployment
        restart_web_server
        send_notification "failed" "Health checks failed, deployment rolled back"
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
SpotOn Frontend Deployment Script

Usage: $0 [OPTIONS]

Environment Variables:
  VITE_API_BASE_URL      API server base URL (required)
  VITE_WS_BASE_URL       WebSocket server base URL (required)
  VITE_ENVIRONMENT       Deployment environment (required)
  HEALTH_CHECK_URL       URL for post-deployment health check (optional)
  WEB_SERVER_SERVICE     systemd service name for web server restart (optional)
  SLACK_WEBHOOK_URL      Slack webhook for deployment notifications (optional)
  RUN_TESTS              Force running tests even in production (optional)
  CLEAN_NODE_MODULES     Remove node_modules after deployment (optional)

Options:
  -h, --help             Show this help message
  -t, --test-only        Run tests without deploying
  -b, --build-only       Build without deploying
  -r, --rollback         Rollback to previous deployment

Examples:
  # Standard deployment
  VITE_API_BASE_URL=https://api.example.com \\
  VITE_WS_BASE_URL=wss://api.example.com \\
  VITE_ENVIRONMENT=production \\
  $0

  # Deployment with health check
  HEALTH_CHECK_URL=https://app.example.com \\
  WEB_SERVER_SERVICE=nginx \\
  $0

  # Test-only run
  $0 --test-only

EOF
}

# Command line argument parsing
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -t|--test-only)
        log "Running tests only..."
        validate_environment
        pre_deployment_checks
        install_dependencies
        run_tests
        cleanup
        success "Tests completed successfully"
        exit 0
        ;;
    -b|--build-only)
        log "Building only..."
        validate_environment
        pre_deployment_checks
        install_dependencies
        build_application
        cleanup
        success "Build completed successfully"
        exit 0
        ;;
    -r|--rollback)
        log "Starting manual rollback..."
        rollback_deployment
        restart_web_server
        success "Rollback completed successfully"
        exit 0
        ;;
    "")
        # No arguments, run full deployment
        main
        ;;
    *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac