// auth/jwt-auth.guard.ts
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Request } from 'express';
  
  declare module 'express' {
    export interface Request {
      user?: any; // 👈 Add user property to Request interface
    }
  }
  import * as jwt from 'jsonwebtoken';
import { envVariables } from '../config/env.variables';
  
  @Injectable()
  export class JwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<Request>();
      const authHeader = request.headers['authorization'];
  
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token not found');
      }
  
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, envVariables.JWT_SECRET); 
        request.user = decoded; 
        return true;
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
  }
  