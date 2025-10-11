// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin/admin.service';
import { envVariables } from './config/env.variables';
import * as express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

async function bootstrap() {
  console.log('🚀 Starting application...');
  console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
  const port = Number(process.env.PORT) || 3000;
  console.log('🔧 Port:', String(port));

  // Start a minimal Express server immediately for liveness
  const server = express();

  // Liveness endpoint that does not depend on DB or Nest
  server.get('/health/minimal', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(), 
      message: 'Minimal health check passed',
      uptime: process.uptime(),
      port: process.env.PORT || 3000
    });
  });

  // Optional very basic info endpoint
  server.get('/health/basic', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), message: 'Basic health check passed' });
  });

  // Root endpoint for basic connectivity test
  server.get('/', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Ulgurib Qol API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port: process.env.PORT || 3000
    });
  });

  // Start the Express server and wait for it to be ready
  await new Promise<void>((resolve, reject) => {
    const serverInstance = server.listen(port, '0.0.0.0', () => {
      console.log(`✅ Express liveness server started on http://0.0.0.0:${port}`);
      console.log('🌐 Liveness endpoint available at /health/minimal');
      console.log('🌐 Root endpoint available at /');
      console.log('🌐 Basic health endpoint available at /health/basic');
      resolve();
    });

    serverInstance.on('error', (error) => {
      console.error('❌ Express server error:', error);
      reject(error);
    });
  });

  // Give the server a moment to be fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('✅ Server is ready to accept requests');

  // Continue with full Nest app initialization without blocking liveness
  try {
    // Log environment variables for debugging
    console.log('🔧 Environment variables check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
    console.log('ADMIN_PASSWORD exists:', !!process.env.ADMIN_PASSWORD);
    console.log('WEBHOOK_URL exists:', !!process.env.WEBHOOK_URL);

    // Validate environment variables (non-fatal for liveness)
    console.log('🔧 Validating environment variables...');
    try {
      envVariables.validate();
      console.log('✅ Environment variables validated');
    } catch (validationError) {
      console.error('❌ Environment validation failed:', (validationError as Error).message);
      console.error('❌ Required environment variables may be missing. The liveness endpoint is still available.');
      console.error('❌ Available environment variables:');
      console.error('  - NODE_ENV:', process.env.NODE_ENV);
      console.error('  - PORT:', process.env.PORT);
      console.error('  - DATABASE_URL exists:', !!process.env.DATABASE_URL);
      console.error('  - TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
      console.error('  - ADMIN_PASSWORD exists:', !!process.env.ADMIN_PASSWORD);
      console.error('  - WEBHOOK_URL exists:', !!process.env.WEBHOOK_URL);
      // Do not throw; keep liveness running. Return early to avoid starting Nest.
      return;
    }

    console.log('🔧 Creating NestJS application...');
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      { logger: ['error', 'warn', 'log', 'debug', 'verbose'] }
    );
    // nestApp.useGlobalPipes(new ValidationPipe({ transform: true })); // Temporarily disabled for debugging
    console.log('✅ NestJS application created');

    // Enable CORS for web app with production domains
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-frontend-domain.com',
      'https://mazza-frontend.onrender.com',
      'https://mazza-frontend.vercel.app',
      'https://mazza-frontend.netlify.app',
      'https://mazza-frontend-clean.vercel.app',
      'https://mazza-frontend-clean-git-main-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-xrrjhoywb-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-n668m2w88-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-lt846lnmc-temurxs-projects.vercel.app',
      'https://mazza-frontend-clean-pnsvghu1r-temurxs-projects.vercel.app',
    ];

    nestApp.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (origin.includes('mazza-frontend-clean') && origin.includes('.vercel.app')) return callback(null, true);
        if (origin.includes('localhost')) return callback(null, true);
        if (!origin) return callback(null, true);
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
      const adminService = nestApp.get(AdminService);
      await adminService.initializeAdmin();
      console.log('✅ Admin account initialized');
    } catch (adminError: any) {
      console.warn('⚠️ Admin initialization failed:', adminError.message);
      console.warn('⚠️ Continuing without admin initialization...');
    }

    // Initialize Nest on top of the already-listening Express server
    await nestApp.init();
    console.log(`✅ NestJS application initialized and mounted on http://0.0.0.0:${port}`);

    if (envVariables.USE_WEBHOOK) {
      console.log('Bot running in WEBHOOK mode');
      console.log(`Webhook URL: ${envVariables.WEBHOOK_URL}/webhook`);
      console.log(`Webhook secret: ${envVariables.WEBHOOK_SECRET ? 'Configured' : 'Not configured'}`);
      if (!envVariables.WEBHOOK_URL.startsWith('https://')) {
        console.warn('WARNING: Webhook URL should use HTTPS for security');
      }
    } else {
      console.log('Bot running in LONG POLLING mode');
    }

    console.log(`Environment: ${envVariables.NODE_ENV}`);
    console.log('Web App API available at /webapp/*');
    console.log('Bot API available at /bot/*');
    console.log('Health check available at /health and /health/minimal');
  } catch (error: any) {
    console.error('❌ Failed to fully initialize Nest application:', error.message);
    console.error('❌ Error details:', error);
    console.error('The liveness endpoint remains available.');
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
