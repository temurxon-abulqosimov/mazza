#!/bin/sh

echo "🚀 Starting Railway deployment..."

# Set default environment variables if not set
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}

echo "🔧 Environment: $NODE_ENV"
echo "🔧 Port: $PORT"

# Log environment variables for debugging (without sensitive data)
echo "🔧 Environment check:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL exists: $([ -n "$DATABASE_URL" ] && echo "yes" || echo "no")"
echo "WEBHOOK_URL exists: $([ -n "$WEBHOOK_URL" ] && echo "yes" || echo "no")"
echo "BOT_TOKEN exists: $([ -n "$BOT_TOKEN" ] && echo "yes" || echo "no")"

# Wait for database to be ready (if DATABASE_URL is set)
if [ ! -z "$DATABASE_URL" ]; then
  echo "🔧 Waiting for database connection..."
  # Add a small delay to ensure database is ready
  sleep 10
fi

# Start the application with better error handling
echo "🔧 Starting NestJS application..."
echo "🔧 Working directory: $(pwd)"
echo "🔧 Files in directory: $(ls -la)"

# Try to start the application
if [ -f "dist/main.js" ]; then
  echo "🔧 Found dist/main.js, starting with node..."
  exec node dist/main.js
else
  echo "🔧 dist/main.js not found, trying npm start:prod..."
  exec npm run start:prod
fi
