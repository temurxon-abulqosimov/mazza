// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin/admin.service';
import { envVariables } from './config/env.variables';

async function bootstrap() {
  try {
    // Validate environment variables before starting
    envVariables.validate();
    
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    // Initialize admin account
    const adminService = app.get(AdminService);
    await adminService.initializeAdmin();
    console.log('✅ Admin account initialized');
    
    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    if (envVariables.USE_WEBHOOK) {
      console.log('🚀 Bot running in WEBHOOK mode');
      console.log(`📡 Webhook URL: ${envVariables.WEBHOOK_URL}/webhook`);
      console.log(`🔐 Webhook secret: ${envVariables.WEBHOOK_SECRET ? 'Configured' : 'Not configured'}`);
      
      // Additional webhook validation
      if (!envVariables.WEBHOOK_URL.startsWith('https://')) {
        console.warn('⚠️  WARNING: Webhook URL should use HTTPS for security');
      }
    } else {
      console.log('🚀 Bot running in LONG POLLING mode');
    }
    
    console.log(`🌐 NestJS server started on port ${port}`);
    console.log(`🌍 Environment: ${envVariables.NODE_ENV}`);
    
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    if (error.message.includes('WEBHOOK_URL')) {
      console.error('💡 Tip: Make sure your WEBHOOK_URL is set correctly in .env file');
    }
    process.exit(1);
  }
}

bootstrap();