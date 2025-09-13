# KPanel Production Docker Image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Create kpanel user
RUN addgroup -g 1001 -S kpanel && \
    adduser -S kpanel -u 1001 -G kpanel

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production && \
    cd client && npm ci

# Copy application code
COPY . .

# Build client
RUN cd client && npm run build

# Create necessary directories
RUN mkdir -p database logs conf && \
    chown -R kpanel:kpanel /app

# Switch to non-root user
USER kpanel

# Generate default environment
RUN echo "NODE_ENV=production\nPORT=2222\nDB_PATH=/app/database/kpanel.db" > .env

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:2222/api/health || exit 1

# Expose port
EXPOSE 2222

# Start command
CMD ["node", "kpanel-server-enterprise.js"]