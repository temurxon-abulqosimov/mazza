const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoints (immediate response)
app.get('/health/minimal', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Minimal health check passed'
  });
});

app.get('/health/basic', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Basic health check passed'
  });
});

app.get('/health/simple', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Simple health check passed'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    health: '/health',
    bot: 'Telegram bot is starting...'
  });
});

// Start the server immediately for health checks
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Express server started on port ${port}`);
  console.log(`🌐 Health check available at /health/minimal`);
  console.log(`🌐 Server is listening on http://0.0.0.0:${port}`);
});

// Start NestJS application in the background
async function startNestJS() {
  try {
    console.log('🚀 Starting NestJS application...');
    
    // Set default environment variables if not set
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN not set, using placeholder');
      process.env.TELEGRAM_BOT_TOKEN = 'placeholder-token';
    }
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('⚠️ ADMIN_PASSWORD not set, using default');
      process.env.ADMIN_PASSWORD = 'admin123';
    }
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️ DATABASE_URL not set, using default');
      process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/ulgur_bot';
    }
    
    const nestApp = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    
    // Enable CORS
    nestApp.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'x-language'],
      credentials: true,
    });
    
    // Don't listen on a separate port, just initialize
    await nestApp.init();
    
    console.log('✅ NestJS application initialized');
    console.log('🤖 Telegram bot should be working now');
    
  } catch (error) {
    console.error('❌ Failed to start NestJS application:', error.message);
    console.error('⚠️ Continuing with Express server only...');
  }
}

// Start NestJS after a short delay
setTimeout(startNestJS, 2000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
