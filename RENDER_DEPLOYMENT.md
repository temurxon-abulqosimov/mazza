# Render.com Deployment Guide for Ulgur Backend

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Render.com Account**: Sign up at [render.com](https://render.com)
3. **Telegram Bot Token**: Get from [@BotFather](https://t.me/botfather)
4. **PostgreSQL Database**: We'll use Render's managed PostgreSQL

## Step 1: Prepare Your Repository

### 1.1 Ensure your package.json has the correct scripts:
```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  }
}
```

### 1.2 Create a health check endpoint (already created above)

## Step 2: Deploy to Render.com

### 2.1 Create a New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select your repository: `ulgurib_qol`

### 2.2 Configure the Service

**Basic Settings:**
- **Name**: `ulgur-backend`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Plan**: `Starter` (Free tier)

**Advanced Settings:**
- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes`

### 2.3 Set Environment Variables

In the Render dashboard, go to "Environment" tab and add:

#### Required Variables:
```env
NODE_ENV=production
PORT=10000

# Database (will be provided by Render PostgreSQL)
DB_HOST=your-render-postgres-host
DB_PORT=5432
DB_USERNAME=your-render-postgres-user
DB_PASSWORD=your-render-postgres-password
DB_NAME=your-render-postgres-db

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
USE_WEBHOOK=true
WEBHOOK_URL=https://your-render-app-url.onrender.com
WEBHOOK_SECRET=your_webhook_secret

# Admin
ADMIN_TELEGRAM_ID=your_telegram_id
ADMIN_USERNAME=@your_username
ADMIN_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

## Step 3: Set Up PostgreSQL Database

### 3.1 Create PostgreSQL Service

1. In Render dashboard, click "New +" → "PostgreSQL"
2. **Name**: `ulgur-database`
3. **Plan**: `Starter` (Free tier)
4. **Database Name**: `ulgur_db`
5. **User**: `ulgur_user`
6. **Password**: Generate a secure password

### 3.2 Get Database Connection Details

After creating the database, copy the connection details:
- **Host**: `dpg-xxxxx-a.oregon-postgres.render.com`
- **Port**: `5432`
- **Database**: `ulgur_db`
- **Username**: `ulgur_user`
- **Password**: `your_generated_password`

### 3.3 Update Environment Variables

Update your web service environment variables with the database details:

```env
DB_HOST=dpg-xxxxx-a.oregon-postgres.render.com
DB_PORT=5432
DB_USERNAME=ulgur_user
DB_PASSWORD=your_generated_password
DB_NAME=ulgur_db
```

## Step 4: Deploy and Test

### 4.1 Deploy the Service

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the application
   - Start the service

### 4.2 Monitor the Deployment

1. Go to the "Logs" tab to monitor the deployment
2. Look for successful build and start messages
3. Check for any errors

### 4.3 Test the Health Check

Once deployed, test your health check:
```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "version": "1.0.0"
}
```

## Step 5: Configure Telegram Bot

### 5.1 Set Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
-H "Content-Type: application/json" \
-d '{"url": "https://your-app-name.onrender.com/webhook"}'
```

### 5.2 Set Bot Commands

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setMyCommands" \
-H "Content-Type: application/json" \
-d '{
  "commands": [
    {"command": "start", "description": "Start the bot"},
    {"command": "webapp", "description": "Open web app"},
    {"command": "language", "description": "Change language"},
    {"command": "support", "description": "Contact support"}
  ]
}'
```

### 5.3 Test the Bot

1. Send `/start` to your bot
2. Send `/webapp` to open the web app
3. Check the logs for any errors

## Step 6: Production Optimizations

### 6.1 Enable HTTPS

Render automatically provides HTTPS, but ensure your webhook URL uses HTTPS.

### 6.2 Set Up Monitoring

1. **Health Checks**: Render automatically monitors `/health`
2. **Logs**: Monitor application logs in Render dashboard
3. **Metrics**: Check CPU and memory usage

### 6.3 Database Optimizations

1. **Connection Pooling**: Already configured in your app
2. **Indexes**: Add database indexes for better performance
3. **Backups**: Render provides automatic backups

## Step 7: Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Database Connection Issues**:
   - Verify database credentials
   - Check if database is accessible
   - Ensure SSL is properly configured

3. **Webhook Issues**:
   - Verify webhook URL is HTTPS
   - Check webhook secret configuration
   - Test webhook endpoint manually

4. **Memory Issues**:
   - Monitor memory usage in Render dashboard
   - Consider upgrading to a higher plan
   - Optimize your application code

### Debug Commands:

```bash
# Check webhook status
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"

# Test health endpoint
curl https://your-app-name.onrender.com/health

# Test webhook endpoint
curl -X POST https://your-app-name.onrender.com/webhook \
-H "Content-Type: application/json" \
-d '{"test": "data"}'
```

## Step 8: Scaling and Performance

### 8.1 Upgrade Plan

When you need more resources:
1. Go to your service settings
2. Change plan to "Starter" (paid) or higher
3. Restart the service

### 8.2 Performance Monitoring

1. **CPU Usage**: Monitor in Render dashboard
2. **Memory Usage**: Check for memory leaks
3. **Response Times**: Monitor API response times
4. **Database Performance**: Monitor query performance

## Step 9: Security Checklist

- [ ] Use HTTPS for all URLs
- [ ] Set strong admin password
- [ ] Use secure JWT secrets
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

## Step 10: Backup and Recovery

### 10.1 Database Backups

Render provides automatic backups for PostgreSQL:
1. Go to your database service
2. Check "Backups" tab
3. Download backups if needed

### 10.2 Application Backups

1. Your code is backed up in GitHub
2. Environment variables are stored in Render
3. Keep local backups of important data

## Support and Resources

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **NestJS Documentation**: [nestjs.com](https://nestjs.com)
- **Telegram Bot API**: [core.telegram.org/bots/api](https://core.telegram.org/bots/api)

## Cost Estimation

- **Web Service**: Free tier (750 hours/month)
- **PostgreSQL**: Free tier (1GB storage)
- **Total**: $0/month (within free tier limits)

For production use, consider upgrading to paid plans for better performance and reliability. 