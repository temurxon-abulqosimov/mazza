# Use Node.js 18 LTS
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application (log output to help diagnose build/runtime)
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Expose default port (Railway will set PORT)
EXPOSE 3000

# Health check uses dynamic PORT with fallback to 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD sh -c 'curl -fsS http://127.0.0.1:${PORT:-3000}/health/minimal || exit 1'

# Start the application directly (Railway sets PORT)
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]