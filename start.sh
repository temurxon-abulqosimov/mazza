#!/bin/bash

echo "🚀 Starting application..."
echo "🔧 Environment: $NODE_ENV"
echo "🔧 Port: $PORT"
echo "🔧 Database URL: ${DATABASE_URL:0:20}..."

# Start the application
npm run start:prod
