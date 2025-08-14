# Dockerfile for Uniicon AI Adobe Add-on Server
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p public/generated logs

# Set permissions
RUN chmod +x servers/server.js

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "servers/server.js"]
