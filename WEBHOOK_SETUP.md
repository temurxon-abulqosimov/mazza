# Webhook Setup Guide for Production

This guide will help you switch your Telegram bot from long polling to webhook mode for production deployment.

## Prerequisites

1. **HTTPS Domain**: Your server must have a valid HTTPS certificate
2. **Public IP/Domain**: Your server must be accessible from the internet
3. **Port 443 or 80**: Standard HTTP/HTTPS ports should be open

## Environment Variables

Add these variables to your `.env` file:

```env
# Webhook Configuration
USE_WEBHOOK=true
WEBHOOK_URL=https://your-domain.com
WEBHOOK_SECRET=your-secret-token-here

# Other existing variables...
TELEGRAM_BOT_TOKEN=your-bot-token
PORT=3000
NODE_ENV=production
```

## Step-by-Step Setup

### 1. Update Environment Variables

Make sure your `.env` file includes the webhook configuration:

```env
USE_WEBHOOK=true
WEBHOOK_URL=https://your-domain.com
WEBHOOK_SECRET=your-secret-token-here
```

### 2. Build and Deploy

```bash
# Build the application
npm run build

# Start in production mode
npm run start:prod
```

### 3. Set Up Webhook with Telegram

Use the provided script to set up the webhook:

```bash
# Set up webhook
npm run webhook:setup

# Check webhook status
npm run webhook:info
```

### 4. Verify Webhook Setup

The application will log the webhook status on startup:

```
🚀 Bot running in WEBHOOK mode
📡 Webhook URL: https://your-domain.com/webhook
🔐 Webhook secret: Configured
🌐 NestJS server started on port 3000
🌍 Environment: production
```

## Nginx Configuration (Recommended)

If you're using Nginx as a reverse proxy, here's a sample configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

## PM2 Configuration

If you're using PM2, update your `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ulgur-bot',
    script: 'dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      USE_WEBHOOK: 'true',
      WEBHOOK_URL: 'https://your-domain.com',
      WEBHOOK_SECRET: 'your-secret-token-here',
      // ... other environment variables
    }
  }]
};
```

## Troubleshooting

### Check Webhook Status

```bash
npm run webhook:info
```

### Delete Webhook (if needed)

```bash
npm run webhook:delete
```

### Common Issues

1. **SSL Certificate**: Make sure your domain has a valid SSL certificate
2. **Firewall**: Ensure port 443 (or your configured port) is open
3. **Domain Resolution**: Verify your domain resolves to your server's IP
4. **Webhook URL**: The webhook URL must be accessible from Telegram's servers

### Testing Webhook

You can test if your webhook endpoint is accessible:

```bash
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Switching Back to Long Polling

If you need to switch back to long polling:

1. Set `USE_WEBHOOK=false` in your `.env` file
2. Delete the webhook: `npm run webhook:delete`
3. Restart your application

## Security Considerations

1. **Webhook Secret**: Always use a strong, unique secret token
2. **HTTPS Only**: Never use HTTP for webhooks in production
3. **Rate Limiting**: Consider implementing rate limiting on your webhook endpoint
4. **IP Whitelisting**: Consider whitelisting Telegram's IP ranges if possible

## Monitoring

Monitor your webhook endpoint for:
- Response times
- Error rates
- Availability
- SSL certificate expiration

## Performance Benefits

Webhook mode provides:
- Lower latency for message processing
- Reduced server load
- Better scalability
- More efficient resource usage

## Support

If you encounter issues:
1. Check the application logs
2. Verify webhook configuration
3. Test webhook endpoint accessibility
4. Review Telegram Bot API documentation 