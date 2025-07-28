#!/bin/sh
# Health check script for SpotOn frontend container

set -e

# Configuration
HEALTH_URL="http://localhost:8080/health"
TIMEOUT=5
MAX_RETRIES=3

# Function to check if service is healthy
check_health() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Health check attempt $attempt/$MAX_RETRIES"
        
        # Check HTTP endpoint
        if curl -f -s --max-time $TIMEOUT "$HEALTH_URL" > /dev/null 2>&1; then
            echo "✓ HTTP health check passed"
            return 0
        fi
        
        echo "✗ HTTP health check failed (attempt $attempt)"
        attempt=$((attempt + 1))
        
        if [ $attempt -le $MAX_RETRIES ]; then
            sleep 2
        fi
    done
    
    return 1
}

# Function to check nginx process
check_nginx() {
    if pgrep nginx > /dev/null; then
        echo "✓ Nginx process is running"
        return 0
    else
        echo "✗ Nginx process is not running"
        return 1
    fi
}

# Function to check if HTML files exist
check_files() {
    if [ -f "/usr/share/nginx/html/index.html" ]; then
        echo "✓ Application files are present"
        return 0
    else
        echo "✗ Application files are missing"
        return 1
    fi
}

# Function to check disk space
check_disk() {
    local used_percentage=$(df /usr/share/nginx/html | awk 'NR==2{print $5}' | sed 's/%//')
    
    if [ "$used_percentage" -lt 90 ]; then
        echo "✓ Disk space is adequate ($used_percentage% used)"
        return 0
    else
        echo "✗ Disk space is low ($used_percentage% used)"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local memory_info=$(cat /proc/meminfo)
    local mem_total=$(echo "$memory_info" | grep MemTotal | awk '{print $2}')
    local mem_available=$(echo "$memory_info" | grep MemAvailable | awk '{print $2}')
    
    if [ "$mem_total" -gt 0 ] && [ "$mem_available" -gt 0 ]; then
        local used_percentage=$(( (mem_total - mem_available) * 100 / mem_total ))
        
        if [ "$used_percentage" -lt 90 ]; then
            echo "✓ Memory usage is normal ($used_percentage% used)"
            return 0
        else
            echo "✗ Memory usage is high ($used_percentage% used)"
            return 1
        fi
    else
        echo "✗ Cannot determine memory usage"
        return 1
    fi
}

# Main health check function
main() {
    echo "Starting health check for SpotOn frontend..."
    echo "Timestamp: $(date)"
    
    local exit_code=0
    
    # Perform all checks
    if ! check_nginx; then
        exit_code=1
    fi
    
    if ! check_files; then
        exit_code=1
    fi
    
    if ! check_health; then
        exit_code=1
    fi
    
    if ! check_disk; then
        exit_code=1
    fi
    
    if ! check_memory; then
        exit_code=1
    fi
    
    # Final result
    if [ $exit_code -eq 0 ]; then
        echo "✓ All health checks passed"
        echo "Status: HEALTHY"
    else
        echo "✗ One or more health checks failed"
        echo "Status: UNHEALTHY"
    fi
    
    return $exit_code
}

# Run the health check
main