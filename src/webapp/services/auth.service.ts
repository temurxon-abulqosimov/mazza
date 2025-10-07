import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { SellersService } from '../../sellers/sellers.service';
import { AdminService } from '../../admin/admin.service';
import { envVariables } from '../config/env.variables';
import { BusinessType } from '../../common/enums/business-type.enum';
import { SellerStatus } from '../../common/enums/seller-status.enum';

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
    console.log('🔧 validateUser called with:', { telegramId, role, password });
    let user: any = null;
    
    switch (role) {
      case 'USER':
        console.log('🔧 Validating USER role...');
        user = await this.usersService.findByTelegramId(telegramId);
        console.log('🔧 User found:', !!user);
        break;
      case 'SELLER':
        console.log('🔧 Validating SELLER role...');
        // First check if seller exists
        user = await this.sellersService.findByTelegramId(telegramId);
        console.log('🔧 Seller found in sellers table:', !!user);
        
        // If seller doesn't exist, check if user exists in users table with SELLER role
        if (!user) {
          console.log('🔧 No seller found, checking users table for SELLER role...');
          const userWithSellerRole = await this.usersService.findByTelegramId(telegramId);
          console.log('🔧 User found in users table:', !!userWithSellerRole);
          console.log('🔧 User role:', userWithSellerRole?.role);
          
          if (userWithSellerRole && userWithSellerRole.role === 'SELLER') {
            console.log('🔧 Found user with SELLER role, creating seller record...');
            // Create a seller record for this user
            const createSellerDto = {
              telegramId: telegramId,
              phoneNumber: userWithSellerRole.phoneNumber || '+998901234567',
              businessName: `Business_${telegramId}`,
              businessType: BusinessType.OTHER,
              language: userWithSellerRole.language || 'uz',
              status: SellerStatus.PENDING
            };
            
            console.log('🔧 Creating seller with DTO:', createSellerDto);
            user = await this.sellersService.create(createSellerDto);
            console.log('✅ Created seller record for user:', user.id);
          } else {
            console.log('❌ No user found with SELLER role');
          }
        }
        break;
      case 'ADMIN':
        console.log('🔧 Validating ADMIN role...');
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

    console.log('🔧 Final user result:', !!user);
    if (!user) {
      console.log('❌ No user found, throwing UnauthorizedException');
      throw new UnauthorizedException('User not found');
    }

    console.log('✅ User validated successfully:', { id: user.id, telegramId: user.telegramId });
    return user;
  }

  async login(telegramId: string, role: 'USER' | 'SELLER' | 'ADMIN', password?: string): Promise<AuthResponse> {
    console.log('🔧 login method called with:', { telegramId, role, password });
    
    try {
      const user = await this.validateUser(telegramId, role, password);
      console.log('🔧 User validated, creating JWT tokens...');
      
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
      
      console.log('🔧 JWT tokens created successfully');

      // Return complete user data based on role
      const userResponse: any = {
        id: user.id,
        telegramId: user.telegramId,
        role: role,
        // Note: firstName and lastName come from Telegram WebApp, not database
        // They will be set by the frontend using Telegram user data
      };

      // Add role-specific data
      if (role === 'SELLER') {
        userResponse.businessName = user.businessName;
        userResponse.phoneNumber = user.phoneNumber;
        userResponse.businessType = user.businessType;
        userResponse.location = user.location;
        userResponse.language = user.language;
        userResponse.status = user.status;
        userResponse.imageUrl = user.imageUrl;
      } else if (role === 'USER') {
        userResponse.phoneNumber = user.phoneNumber;
        userResponse.language = user.language;
        userResponse.location = user.location;
      }

      console.log('✅ Login successful, returning response');
      return {
        access_token,
        refresh_token,
        user: userResponse,
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
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
