# SpotOn Frontend - Deployment Guide

## Overview

This document provides comprehensive deployment guidance for the SpotOn frontend application. The application is built with Vite and can be deployed to various hosting platforms including traditional web servers, cloud platforms, and containerized environments.

## Build Process

### Development Build
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Server runs on http://localhost:5173
```

### Production Build
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
# Preview server runs on http://localhost:4173
```

### Build Output Structure
```
dist/
├── index.html              # Main HTML file
├── assets/                 # Static assets
│   ├── index-[hash].js     # Main application bundle
│   ├── index-[hash].css    # Compiled CSS
│   ├── vendor-[hash].js    # Third-party dependencies
│   └── [asset-files]       # Images, fonts, etc.
├── manifest.json           # PWA manifest (if enabled)
└── service-worker.js       # Service worker (if enabled)
```

## Environment Configuration

### Environment Variables

#### Development Environment (.env.development)
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
VITE_ENVIRONMENT=development
```

#### Production Environment (.env.production)
```bash
VITE_API_BASE_URL=https://api.spoton.yourdomain.com
VITE_WS_BASE_URL=wss://api.spoton.yourdomain.com
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
VITE_ENVIRONMENT=production
```

#### Staging Environment (.env.staging)
```bash
VITE_API_BASE_URL=https://api-staging.spoton.yourdomain.com
VITE_WS_BASE_URL=wss://api-staging.spoton.yourdomain.com
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=info
VITE_ENVIRONMENT=staging
```

### Build Configuration (vite.config.ts)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['zustand', 'axios'],
          maps: ['leaflet'],
        },
      },
    },
    
    // Asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    
    // Target browsers
    target: 'es2020',
  },
  
  // Development server configuration
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    
    // Proxy API calls during development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@services': resolve(__dirname, 'src/services'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  
  // CSS configuration
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
});
```

## Deployment Methods

### 1. Static Web Server Deployment

#### Apache Configuration
```apache
# .htaccess file in document root
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Handle client-side routing
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  
  # Security headers
  Header always set X-Frame-Options DENY
  Header always set X-Content-Type-Options nosniff
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  
  # Caching configuration
  <FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
  </FilesMatch>
  
  <FilesMatch "index\.html$">
    ExpiresActive On
    ExpiresDefault "access plus 0 seconds"
  </FilesMatch>
</IfModule>
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name spoton.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name spoton.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Document root
    root /var/www/spoton/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Static assets with long-term caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # HTML files with no caching
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Client-side routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (if serving API from same domain)
    location /api {
        proxy_pass http://backend-server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket proxy
    location /ws {
        proxy_pass http://backend-server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

### 2. Docker Containerization

#### Multi-stage Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy environment configuration script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose Configuration
```yaml
version: '3.8'

services:
  spoton-frontend:
    build: .
    container_name: spoton-frontend
    ports:
      - "80:80"
      - "443:443"
    environment:
      - VITE_API_BASE_URL=https://api.spoton.yourdomain.com
      - VITE_WS_BASE_URL=wss://api.spoton.yourdomain.com
      - VITE_ENVIRONMENT=production
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    restart: unless-stopped
    depends_on:
      - spoton-backend
    networks:
      - spoton-network

  spoton-backend:
    image: spoton-backend:latest
    container_name: spoton-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/spoton
      - REDIS_URL=redis://redis:6379
    networks:
      - spoton-network

networks:
  spoton-network:
    driver: bridge
```

#### Environment Variable Substitution Script
```bash
#!/bin/sh
# docker-entrypoint.sh

# Replace environment variables in JavaScript files
if [ -f /usr/share/nginx/html/assets/index-*.js ]; then
  for file in /usr/share/nginx/html/assets/index-*.js; do
    # Replace placeholder values with environment variables
    sed -i "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL:-http://localhost:8000}|g" "$file"
    sed -i "s|__VITE_WS_BASE_URL__|${VITE_WS_BASE_URL:-ws://localhost:8000}|g" "$file"
    sed -i "s|__VITE_ENVIRONMENT__|${VITE_ENVIRONMENT:-production}|g" "$file"
  done
fi

# Execute the main command
exec "$@"
```

### 3. Cloud Platform Deployments

#### Netlify Deployment
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

# Redirects for client-side routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers for security
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

# Caching for static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### Vercel Deployment
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_BASE_URL": "@spoton_api_url",
    "VITE_WS_BASE_URL": "@spoton_ws_url",
    "VITE_ENVIRONMENT": "production"
  }
}
```

#### AWS S3 + CloudFront Deployment
```bash
#!/bin/bash
# deploy-aws.sh

# Build the application
npm run build

# Upload to S3
aws s3 sync dist/ s3://spoton-frontend-bucket --delete

# Configure S3 bucket for static website hosting
aws s3 website s3://spoton-frontend-bucket \
  --index-document index.html \
  --error-document index.html

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

echo "Deployment complete!"
```

#### CloudFront Distribution Configuration
```json
{
  "CallerReference": "spoton-frontend-distribution",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-spoton-frontend",
        "DomainName": "spoton-frontend-bucket.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/YOUR_OAI_ID"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-spoton-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "/assets/*",
        "TargetOriginId": "S3-spoton-frontend",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 31536000,
        "DefaultTTL": 31536000,
        "MaxTTL": 31536000
      },
      {
        "PathPattern": "*.html",
        "TargetOriginId": "S3-spoton-frontend",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "DefaultTTL": 0,
        "MaxTTL": 0
      }
    ]
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy SpotOn Frontend

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type check
      run: npm run type-check
    
    - name: Run tests
      run: npm test -- --coverage
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        fail_ci_if_error: true

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
        VITE_WS_BASE_URL: ${{ secrets.VITE_WS_BASE_URL }}
        VITE_ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: dist/

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-files
        path: dist/
    
    - name: Deploy to staging
      run: |
        # Add your staging deployment commands here
        echo "Deploying to staging environment..."

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-files
        path: dist/
    
    - name: Deploy to production
      run: |
        # Add your production deployment commands here
        echo "Deploying to production environment..."
    
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()
```

### GitLab CI/CD Pipeline
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

cache:
  paths:
    - node_modules/

before_script:
  - apt-get update -qq && apt-get install -y -qq git curl
  - curl -sL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  - apt-get install -y nodejs
  - npm ci

test:
  stage: test
  script:
    - npm run lint
    - npm run type-check
    - npm test -- --coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  only:
    - main
    - staging

deploy:staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
    # Add staging deployment commands
  environment:
    name: staging
    url: https://staging.spoton.yourdomain.com
  only:
    - staging

deploy:production:
  stage: deploy
  script:
    - echo "Deploying to production..."
    # Add production deployment commands
  environment:
    name: production
    url: https://spoton.yourdomain.com
  only:
    - main
  when: manual
```

## Monitoring and Health Checks

### Application Health Check
```typescript
// src/utils/healthCheck.ts
export const createHealthChecker = () => {
  const checkApplicationHealth = async (): Promise<HealthStatus> => {
    const checks = await Promise.allSettled([
      checkAPIConnection(),
      checkWebSocketConnection(),
      checkLocalStorage(),
      checkBrowserCompatibility(),
    ]);

    const results = checks.map((check, index) => ({
      name: ['API', 'WebSocket', 'LocalStorage', 'Browser'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: check.status === 'rejected' ? check.reason : null,
    }));

    const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  };

  const startPeriodicHealthCheck = (intervalMs = 30000) => {
    setInterval(async () => {
      const health = await checkApplicationHealth();
      console.log('Health check:', health);
      
      // Report to monitoring service if needed
      if (health.status === 'degraded') {
        reportHealthIssue(health);
      }
    }, intervalMs);
  };

  return {
    checkApplicationHealth,
    startPeriodicHealthCheck,
  };
};
```

### Error Monitoring Integration
```typescript
// src/utils/errorReporting.ts
import * as Sentry from '@sentry/react';

export const initializeErrorReporting = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT,
      integrations: [
        new Sentry.BrowserTracing(),
      ],
      tracesSampleRate: 0.1,
      beforeSend(event, hint) {
        // Filter out known non-critical errors
        if (event.exception) {
          const error = hint.originalException;
          if (error && error.name === 'ChunkLoadError') {
            return null; // Don't report chunk load errors
          }
        }
        return event;
      },
    });
  }
};

export const reportError = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setTag(key, context[key]);
        });
      }
      Sentry.captureException(error);
    });
  } else {
    console.error('Error:', error, context);
  }
};
```

## Security Considerations

### Content Security Policy
```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' ws: wss:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
">
```

### Environment Variable Security
```typescript
// src/config/security.ts
const validateEnvironmentVariables = () => {
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_WS_BASE_URL',
    'VITE_ENVIRONMENT',
  ];

  const missing = requiredVars.filter(
    (varName) => !import.meta.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URL formats
  try {
    new URL(import.meta.env.VITE_API_BASE_URL);
    new URL(import.meta.env.VITE_WS_BASE_URL.replace('ws', 'http')); // Validate WebSocket URL format
  } catch (error) {
    throw new Error('Invalid URL format in environment variables');
  }
};

export { validateEnvironmentVariables };
```

## Troubleshooting

### Common Deployment Issues

#### Build Failures
- **Issue**: Out of memory during build
- **Solution**: Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

#### Routing Issues
- **Issue**: 404 errors on direct URL access
- **Solution**: Configure server to serve `index.html` for all routes (see nginx/apache configs above)

#### Environment Variable Issues
- **Issue**: Environment variables not available in production
- **Solution**: Ensure variables are prefixed with `VITE_` and properly configured in deployment environment

#### CORS Issues
- **Issue**: API requests blocked by CORS policy
- **Solution**: Configure backend CORS settings or use proxy configuration

### Performance Optimization
- Enable gzip compression on web server
- Configure proper caching headers
- Use CDN for static assets
- Enable HTTP/2
- Minimize and compress images
- Implement service worker for offline functionality

This deployment guide provides comprehensive instructions for deploying the SpotOn frontend application across various hosting environments while maintaining security, performance, and reliability requirements.