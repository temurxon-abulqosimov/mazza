# Railway Deployment Guide

## Fixed Issues

### 1. Dockerfile Improvements
- ✅ Added `curl` for health checks
- ✅ Added `bash` for startup scripts
- ✅ Improved health check configuration
- ✅ Added proper startup script execution

### 2. Health Endpoint Fixes
- ✅ Enhanced `/health/simple` endpoint with better error handling
- ✅ Added proper Railway health check configuration
- ✅ Improved startup sequence with health endpoint testing

### 3. Application Startup Improvements
- ✅ Better error handling and logging
- ✅ Environment variable validation
- ✅ Railway-specific startup script
- ✅ Improved database connection handling

## Railway Configuration

### Environment Variables Required
Make sure these are set in your Railway project:

```
NODE_ENV=production
DATABASE_URL=your_postgres_connection_string
WEBHOOK_URL=your_railway_app_url
WEBHOOK_SECRET=your_webhook_secret
BOT_TOKEN=your_telegram_bot_token
```

### Health Check Configuration
- **Path**: `/health/simple`
- **Timeout**: 300 seconds
- **Retry Policy**: ON_FAILURE with 5 retries

## Deployment Steps

1. **Push your changes to GitHub**
2. **Connect Railway to your repository**
3. **Set environment variables in Railway dashboard**
4. **Deploy using the updated Dockerfile**

## Troubleshooting

### If health check still fails:
1. Check Railway logs for startup errors
2. Verify all environment variables are set
3. Ensure database is accessible from Railway
4. Check if the application is binding to `0.0.0.0:PORT`

### Common Issues:
- **Database connection**: Make sure `DATABASE_URL` is correct
- **Port binding**: Application should bind to `0.0.0.0:PORT`
- **Environment variables**: All required vars must be set
- **Health endpoint**: Should return 200 status

## Files Modified

1. `Dockerfile` - Added curl, bash, improved health checks
2. `src/main.ts` - Better error handling and Railway-specific logging
3. `src/health.controller.ts` - Enhanced health endpoint
4. `railway.json` - Updated Railway configuration
5. `start-railway.sh` - Railway-specific startup script
6. `.dockerignore` - Optimized Docker build

## Testing Locally

To test the health endpoint locally:

```bash
# Start the application
npm run start:prod

# Test health endpoint
curl http://localhost:3000/health/simple
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "message": "Application is running",
  "version": "1.0.0",
  "environment": "production"
}
```
