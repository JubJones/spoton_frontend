# Multi-stage build for production-ready React app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Add build metadata
ARG BUILD_VERSION=unknown
ARG BUILD_DATE=unknown
ARG COMMIT_HASH=unknown
ARG BUILD_ID=unknown

# Set environment variables
ENV NODE_ENV=production
ENV REACT_APP_VERSION=$BUILD_VERSION
ENV REACT_APP_BUILD_DATE=$BUILD_DATE
ENV REACT_APP_COMMIT_HASH=$COMMIT_HASH
ENV REACT_APP_BUILD_ID=$BUILD_ID

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Optimize build output
RUN yarn run build:optimize

# Production stage
FROM nginx:alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy health check script
COPY docker/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Set proper permissions
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d

# Create nginx run directory
RUN mkdir -p /var/run/nginx && \
    chown -R appuser:appgroup /var/run/nginx

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Set metadata labels
LABEL maintainer="SpotOn Team <dev@spoton.com>"
LABEL version=$BUILD_VERSION
LABEL description="SpotOn Frontend Application"
LABEL build.date=$BUILD_DATE
LABEL build.version=$BUILD_VERSION
LABEL build.commit=$COMMIT_HASH
LABEL build.id=$BUILD_ID

# Start nginx
CMD ["nginx", "-g", "daemon off;"]