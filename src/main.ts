// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin/admin.service';
import { envVariables } from './config/env.variables';

async function bootstrap() {
  try {
    console.log('🚀 Starting application...');
    console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔧 Port:', process.env.PORT || '3000');
    
    // Log environment variables for debugging
    console.log('🔧 Environment variables check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
    console.log('ADMIN_PASSWORD exists:', !!process.env.ADMIN_PASSWORD);
    console.log('WEBHOOK_URL exists:', !!process.env.WEBHOOK_URL);
    
    // Validate environment variables before starting
    console.log('🔧 Validating environment variables...');
    try {
      envVariables.validate();
      console.log('✅ Environment variables validated');
    } catch (validationError) {
      console.error('❌ Environment validation failed:', validationError.message);
      console.error('❌ Required environment variables are missing!');
      console.error('❌ Please set the following in Railway environment variables:');
      console.error('   - TELEGRAM_BOT_TOKEN');
      console.error('   - DATABASE_URL');
      console.error('   - ADMIN_PASSWORD');
      console.error('   - WEBHOOK_URL (if using webhooks)');
      throw new Error('Missing required environment variables');
    }
    
    console.log('🔧 Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    // app.useGlobalPipes(new ValidationPipe({ transform: true })); // Temporarily disabled for debugging
    console.log('✅ NestJS application created');
    
    // Enable CORS for web app with production domains
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-frontend-domain.com', // Replace with your actual frontend domain
      'https://mazza-frontend.onrender.com', // Render frontend URL
      'https://mazza-frontend.vercel.app', // Vercel frontend URL
      'https://mazza-frontend.netlify.app', // Netlify frontend URL
      // Add current Vercel deployment domains
      'https://mazza-frontend-clean.vercel.app',
      'https://mazza-frontend-clean-git-main-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-xrrjhoywb-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-n668m2w88-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-lt846lnmc-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-pnsvghu1r-temurxs-projects.vercel.app',
    ];
    
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Allow all Vercel deployments
        if (origin.includes('mazza-frontend-clean') && origin.includes('.vercel.app')) {
          return callback(null, true);
        }
        
        // Allow localhost for development
        if (origin.includes('localhost')) {
          return callback(null, true);
        }
        
        // Allow Telegram WebApp (no origin)
        if (!origin) {
          return callback(null, true);
        }
        
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'x-language'],
      credentials: true,
    });
    
    // Initialize admin account (with error handling)
    console.log('🔧 Initializing admin account...');
    try {
      const adminService = app.get(AdminService);
      await adminService.initializeAdmin();
      console.log('✅ Admin account initialized');
    } catch (adminError) {
      console.warn('⚠️ Admin initialization failed:', adminError.message);
      console.warn('⚠️ Continuing without admin initialization...');
    }
    
    // Use environment variable for port, default to 3000
    const port = process.env.PORT || 3000;
    console.log(`🔧 Starting server on port ${port}...`);
    
    // Add a small delay to ensure everything is ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await app.listen(port, '0.0.0.0');
    console.log(`✅ Server started successfully on port ${port}`);
    console.log(`🌐 Server is listening on http://0.0.0.0:${port}`);
    
    // Test health endpoint immediately after startup
    console.log('🔧 Testing health endpoint...');
    try {
      const response = await fetch(`http://localhost:${port}/health/simple`);
      if (response.ok) {
        console.log('✅ Health endpoint is working');
      } else {
        console.warn('⚠️ Health endpoint returned non-200 status');
      }
    } catch (healthError) {
      console.warn('⚠️ Health endpoint test failed:', healthError.message);
    }
    
    if (envVariables.USE_WEBHOOK) {
      console.log('Bot running in WEBHOOK mode');
      console.log(`Webhook URL: ${envVariables.WEBHOOK_URL}/webhook`);
      console.log(`Webhook secret: ${envVariables.WEBHOOK_SECRET ? "Configured" : "Not configured"}`);
      
      // Additional webhook validation
      if (!envVariables.WEBHOOK_URL.startsWith('https://')) {
        console.warn('WARNING: Webhook URL should use HTTPS for security');
      }
    } else {
      console.log('Bot running in LONG POLLING mode');
    }
    
    console.log(`NestJS server started on port ${port}`);
    console.log(`Environment: ${envVariables.NODE_ENV}`);
    console.log('Web App API available at /webapp/*');
    console.log('Bot API available at /bot/*');
    console.log('Health check available at /health');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    console.error('❌ Error details:', error);
    
    if (error.message.includes('WEBHOOK_URL')) {
      console.error('💡 Tip: Make sure your WEBHOOK_URL is set correctly in Railway environment variables');
    }
    if (error.message.includes('DATABASE_URL')) {
      console.error('💡 Tip: Make sure your DATABASE_URL is set correctly in Railway environment variables');
    }
    if (error.message.includes('connection')) {
      console.error('💡 Tip: Check your database connection and credentials in Railway');
    }
    if (error.message.includes('EADDRINUSE')) {
      console.error('💡 Tip: Port is already in use. Check Railway port configuration');
    }
    
    // Log environment variables for debugging (without sensitive data)
    console.error('🔧 Environment variables:');
    console.error('NODE_ENV:', process.env.NODE_ENV);
    console.error('PORT:', process.env.PORT);
    console.error('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.error('WEBHOOK_URL exists:', !!process.env.WEBHOOK_URL);
    
    // Don't exit immediately, give some time for logs
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  }
}

bootstrap();
