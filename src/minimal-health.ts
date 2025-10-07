import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function startMinimalServer() {
  try {
    console.log('🚀 Starting minimal server...');
    
    // Create minimal app without database or bot modules
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    
    // Enable CORS
    app.enableCors();
    
    // Add minimal health endpoint
    app.use('/health/minimal', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Minimal health check passed'
      });
    });
    
    // Add basic health endpoint
    app.use('/health/basic', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Basic health check passed'
      });
    });
    
    // Add simple health endpoint
    app.use('/health/simple', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Simple health check passed'
      });
    });
    
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    
    console.log(`✅ Minimal server started on port ${port}`);
    console.log(`🌐 Health check available at /health/minimal`);
    
  } catch (error) {
    console.error('❌ Failed to start minimal server:', error.message);
    process.exit(1);
  }
}

startMinimalServer();
