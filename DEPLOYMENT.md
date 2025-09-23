# Deployment Guide for Mazza Telegram Mini App

##  Quick Start

### 1. Backend Deployment

#### Using Heroku
1. **Create Heroku App**
   ```bash
   heroku create mazza-backend
   ```

2. **Add PostgreSQL Addon**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set BOT_TOKEN=your_bot_token
   heroku config:set ADMIN_TELEGRAM_ID=your_telegram_id
   heroku config:set ADMIN_PASSWORD=your_password
   heroku config:set WEBAPP_URL=https://your-frontend-url.com
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

#### Using Railway
1. **Connect GitHub Repository**
2. **Add PostgreSQL Service**
3. **Set Environment Variables**
4. **Deploy**

### 2. Frontend Deployment

#### Using Vercel
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd mazza-frontend
   vercel --prod
   ```

3. **Set Environment Variables**
   - `REACT_APP_API_URL`: Your backend URL

#### Using Netlify
1. **Connect GitHub Repository**
2. **Set Build Command**: `npm run build`
3. **Set Publish Directory**: `build`
4. **Set Environment Variables**

### 3. Bot Configuration

1. **Set Webhook**
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
   -H "Content-Type: application/json" \
   -d '{"url": "https://your-backend-url.com/webhook"}'
   ```

2. **Set Bot Commands**
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setMyCommands" \
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

3. **Set Web App URL**
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebApp" \
   -H "Content-Type: application/json" \
   -d '{"url": "https://your-frontend-url.com"}'
   ```

##  Environment Variables

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=mazza_db

# Telegram Bot
BOT_TOKEN=your_bot_token
USE_WEBHOOK=true
WEBHOOK_URL=https://your-backend-url.com
WEBHOOK_SECRET=your_webhook_secret

# Admin
ADMIN_TELEGRAM_ID=your_telegram_id
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password

# Web App
WEBAPP_URL=https://your-frontend-url.com
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-url.com
```

##  Testing the Mini App

1. **Start the bot**: Send `/start` to your bot
2. **Launch web app**: Send `/webapp` command
3. **Test features**:
   - Browse products
   - Filter by category
   - View product details
   - Test location features

##  Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration in main.ts
   - Ensure frontend URL is in allowed origins

2. **Authentication Errors**
   - Verify Telegram initData validation
   - Check bot token configuration

3. **Database Connection**
   - Verify database credentials
   - Check database server status

4. **Webhook Issues**
   - Ensure webhook URL is HTTPS
   - Check webhook secret configuration

### Debug Commands

```bash
# Check bot webhook
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"

# Test database connection
npm run typeorm:run

# Check logs
heroku logs --tail
```

##  Security Checklist

- [ ] Use HTTPS for all URLs
- [ ] Set strong admin password
- [ ] Configure CORS properly
- [ ] Validate all inputs
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Regular security updates

##  Monitoring

### Health Checks
- Backend: `GET /health`
- Database: Check connection status
- Bot: Verify webhook status

### Logs
- Application logs
- Error tracking
- Performance metrics

##  Production Optimizations

1. **Database**
   - Enable connection pooling
   - Set up read replicas
   - Regular backups

2. **Caching**
   - Redis for session storage
   - CDN for static assets

3. **Performance**
   - Enable compression
   - Optimize images
   - Minify assets

4. **Monitoring**
   - Set up alerts
   - Monitor performance
   - Track errors

##  Scaling

### Horizontal Scaling
- Multiple backend instances
- Load balancer
- Database clustering

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Cache frequently accessed data

---

For more detailed information, check the main README.md file.
