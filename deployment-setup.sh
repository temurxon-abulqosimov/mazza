#!/bin/bash

# AWS EC2 Deployment Setup Script for Telegram Bot
# Run this script on your EC2 instance

echo "🚀 Setting up Telegram Bot deployment on AWS EC2..."

# Update system packages
echo "📦 Updating system packages..."
sudo yum update -y

# Install Node.js 18.x and npm
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install PostgreSQL (if not using external database)
echo "📦 Installing PostgreSQL..."
sudo yum install -y postgresql postgresql-server postgresql-contrib

# Initialize PostgreSQL database
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install nginx (optional, for reverse proxy)
echo "📦 Installing nginx..."
sudo yum install -y nginx

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/telegram-bot
sudo chown $USER:$USER /opt/telegram-bot

# Install git if not present
sudo yum install -y git

echo "✅ Basic setup completed!"
echo "📋 Next steps:"
echo "1. Clone your repository to /opt/telegram-bot"
echo "2. Create .env file with your configuration"
echo "3. Run the deployment script" 