# KPanel Production Docker Image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git curl unzip

# Clone repository and setup
RUN git clone https://github.com/herfaaljihad/kpanel.git . && \
    npm install --production --omit=dev

# Download pre-built client or build fallback
RUN cd client && \
    echo "Downloading pre-built client..." && \
    (curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/client-dist.zip -o client-dist.zip && \
     unzip -q client-dist.zip && rm client-dist.zip) || \
    (echo "Building client fallback..." && npm install && npm run build)

# Create necessary directories
RUN mkdir -p database logs conf

# Generate default environment
RUN echo "NODE_ENV=production\nPORT=3000\nDB_PATH=/app/database/kpanel.db" > .env

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "docker-http-server-fixed.js"]