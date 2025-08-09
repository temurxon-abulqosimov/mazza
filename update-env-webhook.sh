#!/bin/bash

# Script to update .env file with webhook configuration
# Usage: ./update-env-webhook.sh

echo "🔧 Updating .env file with webhook configuration..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from example..."
    cp env.production.example .env
    echo "✅ Created .env file from example"
fi

# Function to update or add environment variable
update_env_var() {
    local key=$1
    local value=$2
    local comment=$3
    
    if grep -q "^${key}=" .env; then
        # Variable exists, update it
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/^${key}=.*/${key}=${value}/" .env
        else
            # Linux
            sed -i "s/^${key}=.*/${key}=${value}/" .env
        fi
        echo "✅ Updated ${key}"
    else
        # Variable doesn't exist, add it
        echo "" >> .env
        echo "# ${comment}" >> .env
        echo "${key}=${value}" >> .env
        echo "✅ Added ${key}"
    fi
}

# Get user input for webhook configuration
echo ""
echo "📝 Please provide your webhook configuration:"
echo ""

read -p "Enter your domain (e.g., https://your-domain.com): " webhook_url
read -p "Enter webhook secret token (or press Enter to generate one): " webhook_secret

# Generate secret if not provided
if [ -z "$webhook_secret" ]; then
    webhook_secret=$(openssl rand -hex 32)
    echo "🔐 Generated webhook secret: ${webhook_secret}"
fi

# Update environment variables
update_env_var "USE_WEBHOOK" "true" "Webhook Configuration"
update_env_var "WEBHOOK_URL" "$webhook_url" "Webhook URL"
update_env_var "WEBHOOK_SECRET" "$webhook_secret" "Webhook Secret Token"

echo ""
echo "✅ .env file updated successfully!"
echo ""
echo "📋 Summary of changes:"
echo "   USE_WEBHOOK=true"
echo "   WEBHOOK_URL=$webhook_url"
echo "   WEBHOOK_SECRET=$webhook_secret"
echo ""
echo "🚀 Next steps:"
echo "   1. Restart your application: npm run start:prod"
echo "   2. Set up webhook: npm run webhook:setup"
echo "   3. Check webhook status: npm run webhook:info"
echo ""
echo "⚠️  IMPORTANT: Keep your webhook secret secure and don't share it!" 