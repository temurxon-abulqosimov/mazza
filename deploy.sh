#!/bin/bash

# Telegram Bot Deployment Script
# Run this script to deploy your bot

set -e

echo "🚀 Starting Telegram Bot deployment..."

# Navigate to project directory
cd /opt/telegram-bot

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f ecosystem.config.js ]; then
    echo "📝 Creating PM2 ecosystem file..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'telegram-bot',
    script: 'dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
fi

# Create logs directory
mkdir -p logs

# Stop existing PM2 process if running
echo "🛑 Stopping existing process..."
pm2 stop telegram-bot || true
pm2 delete telegram-bot || true

# Start the application with PM2
echo "▶️ Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

echo "✅ Deployment completed successfully!"
echo "📊 Check status with: pm2 status"
echo "📋 View logs with: pm2 logs telegram-bot"
echo "🔄 Restart with: pm2 restart telegram-bot" 