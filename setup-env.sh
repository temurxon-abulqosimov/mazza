#!/bin/bash

# Environment Setup Script for Telegram Bot
# This script helps you set up environment variables on the server

echo "🔧 Setting up environment variables for Telegram Bot..."

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Create .env file from template
cp env.production.example .env

echo "📝 Please fill in the following environment variables:"
echo ""

# Function to prompt for input with default value
prompt_with_default() {
    local var_name=$1
    local default_value=$2
    local description=$3
    
    echo "🔹 $description"
    read -p "$var_name [$default_value]: " input_value
    
    if [ -z "$input_value" ]; then
        input_value=$default_value
    fi
    
    # Update .env file
    sed -i "s/^$var_name=.*/$var_name=$input_value/" .env
    echo "✅ Set $var_name=$input_value"
    echo ""
}

# Prompt for each environment variable
prompt_with_default "BOT_TOKEN" "your_telegram_bot_token_here" "Enter your Telegram bot token from @BotFather"
prompt_with_default "DB_HOST" "localhost" "Enter database host (localhost for local PostgreSQL)"
prompt_with_default "DB_PORT" "5432" "Enter database port"
prompt_with_default "DB_USERNAME" "telegram_bot" "Enter database username"
prompt_with_default "DB_PASSWORD" "your_secure_password" "Enter database password"
prompt_with_default "DB_DATABASE" "telegram_bot_db" "Enter database name"

# Generate random JWT secret if not provided
echo "🔹 JWT Secret (for authentication)"
read -p "JWT_SECRET [auto-generate]: " jwt_secret
if [ -z "$jwt_secret" ]; then
    jwt_secret=$(openssl rand -base64 32)
    echo "✅ Auto-generated JWT_SECRET"
else
    echo "✅ Using provided JWT_SECRET"
fi
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
echo ""

prompt_with_default "ADMIN_PASSWORD" "your_admin_password" "Enter admin panel password"

# Set NODE_ENV to production
sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" .env

echo "🎉 Environment setup completed!"
echo ""
echo "📋 Summary of your configuration:"
echo "=================================="
cat .env | grep -v "^#" | grep -v "^$"
echo "=================================="
echo ""
echo "🔒 Security reminder:"
echo "- Keep your .env file secure and never commit it to git"
echo "- Use strong passwords for database and admin access"
echo "- Regularly rotate your JWT_SECRET and BOT_TOKEN"
echo ""
echo "🚀 Next step: Run './deploy.sh' to deploy your bot" 