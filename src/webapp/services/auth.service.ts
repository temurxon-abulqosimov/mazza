import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { SellersService } from '../../sellers/sellers.service';
import { AdminService } from '../../admin/admin.service';
import { envVariables } from '../config/env.variables';

export interface JwtPayload {
  sub: number;
  email?: string;
  telegramId: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    telegramId: string;
    role: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
    private readonly adminService: AdminService,
  ) {}

  async validateUser(telegramId: string, role: 'USER' | 'SELLER' | 'ADMIN', password?: string): Promise<any> {
    let user: any = null;
    
    switch (role) {
      case 'USER':
        user = await this.usersService.findByTelegramId(telegramId);
        break;
      case 'SELLER':
        user = await this.sellersService.findByTelegramId(telegramId);
        break;
      case 'ADMIN':
        // Check admin credentials from environment variables
        if (!password) {
          throw new UnauthorizedException('Password is required for admin login');
        }
        if (telegramId === envVariables.ADMIN_TELEGRAM_ID && password === envVariables.ADMIN_PASSWORD) {
          user = {
            id: 1, // Admin ID
            telegramId: envVariables.ADMIN_TELEGRAM_ID,
            username: envVariables.ADMIN_USERNAME || 'admin'
          };
        } else {
          throw new UnauthorizedException('Invalid admin credentials');
        }
        break;
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async login(telegramId: string, role: 'USER' | 'SELLER' | 'ADMIN', password?: string): Promise<AuthResponse> {
    const user = await this.validateUser(telegramId, role, password);
    
    const payload: JwtPayload = {
      sub: user.id,
      telegramId: user.telegramId,
      role: role,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: envVariables.JWT_EXPIRATION_TIME,
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: envVariables.JWT_REFRESH_SECRET || envVariables.JWT_SECRET,
      expiresIn: '7d',
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        role: role,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: envVariables.JWT_REFRESH_SECRET || envVariables.JWT_SECRET,
      });

      const newPayload: JwtPayload = {
        sub: payload.sub,
        telegramId: payload.telegramId,
        role: payload.role,
      };

      const access_token = this.jwtService.sign(newPayload, {
        expiresIn: envVariables.JWT_EXPIRATION_TIME,
      });

      return { access_token };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
