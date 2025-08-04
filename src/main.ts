// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin/admin.service';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    // Initialize admin account
    const adminService = app.get(AdminService);
    await adminService.initializeAdmin();
    console.log('✅ Admin account initialized');
    
    await app.listen(process.env.PORT || 3000);
    console.log('🚀 NestJS server started on port', process.env.PORT || 3000);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();