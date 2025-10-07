import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private dataSource?: DataSource) {}

  @Get()
  async check() {
    try {
      let databaseStatus = 'unknown';
      if (this.dataSource) {
        try {
          await this.dataSource.query('SELECT 1');
          databaseStatus = 'connected';
        } catch (dbError) {
          databaseStatus = 'disconnected';
        }
      }
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        database: databaseStatus,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        database: 'error',
        error: error.message,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        },
      };
    }
  }

  @Get('ready')
  async ready() {
    try {
      let databaseStatus = 'unknown';
      if (this.dataSource) {
        try {
          await this.dataSource.query('SELECT 1');
          databaseStatus = 'connected';
        } catch (dbError) {
          databaseStatus = 'disconnected';
        }
      }
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: databaseStatus,
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: 'error',
        error: error.message,
      };
    }
  }

  @Get('simple')
  simple() {
    try {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Application is running',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('ping')
  ping() {
    return { pong: true };
  }

  @Get('basic')
  basic() {
    return { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Basic health check passed',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000
    };
  }

  @Get('minimal')
  minimal() {
    return { 
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
} 