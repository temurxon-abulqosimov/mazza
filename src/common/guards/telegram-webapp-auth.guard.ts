import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { envVariables } from '../../config/env.variables';

interface AuthenticatedRequest extends Request {
  user?: any;
}

@Injectable()
export class TelegramWebappAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const initData = request.headers['x-telegram-init-data'] as string;

    // Allow development mode without authentication
    if (envVariables.NODE_ENV === 'development' && !initData) {
      // Create a mock user for development
      request.user = {
        id: 123456789,
        first_name: 'Development',
        last_name: 'User',
        username: 'dev_user',
        language_code: 'en'
      };
      return true;
    }

    if (!initData) {
      throw new UnauthorizedException('Telegram init data is required');
    }

    // For now, we'll just validate that init data exists
    // In production, you should validate the hash using HMAC-SHA256
    try {
      const params = new URLSearchParams(initData);
      const userParam = params.get('user');
      
      if (!userParam) {
        throw new UnauthorizedException('Invalid Telegram init data');
      }

      const user = JSON.parse(userParam);
      request.user = user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid Telegram init data format');
    }
  }
}
