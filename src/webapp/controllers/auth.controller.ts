import { Controller, Post, Body, Get, UseGuards, Req, HttpException, HttpStatus, ValidationPipe, UsePipes } from '@nestjs/common';
import { AuthService, AuthResponse } from '../services/auth.service';
import { UsersService } from '../../users/users.service';
import { SellersService } from '../../sellers/sellers.service';
import { TelegramWebappAuthGuard } from '../../common/guards/telegram-webapp-auth.guard';
import { JwtAuthGuard } from '../guard/auth.guard';
import { IsString, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from '../../common/dtos/location.dto';

export class LoginDto {
  @IsString()
  telegramId: string;
  
  @IsEnum(['USER', 'SELLER', 'ADMIN'])
  role: 'USER' | 'SELLER' | 'ADMIN';
  
  @IsOptional()
  @IsString()
  password?: string; // Required for ADMIN role
}

export class RegisterDto {
  @IsString()
  telegramId: string;
  
  @IsEnum(['USER', 'SELLER'])
  role: 'USER' | 'SELLER';
  
  @IsString()
  phoneNumber: string;
  
  @IsEnum(['uz', 'ru'])
  language: 'uz' | 'ru';
  
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

@Controller('webapp/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
  ) {}

  @Post('login')
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    forbidNonWhitelisted: true,
    validateCustomDecorators: true
  }))
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    try {
      console.log('Login attempt:', loginDto);
      
      // For admin login, password is required
      if (loginDto.role === 'ADMIN' && !loginDto.password) {
        throw new HttpException('Password is required for admin login', HttpStatus.BAD_REQUEST);
      }
      
      return await this.authService.login(loginDto.telegramId, loginDto.role, loginDto.password);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Login failed: ${error.message}`, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('register')
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    forbidNonWhitelisted: false, // Change this to false
    validateCustomDecorators: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }))
  // @UseGuards(TelegramWebappAuthGuard) // Commented out for testing
  async register(@Req() req, @Body() registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      console.log('Registration attempt:', registerDto);
      
      // For testing, use the telegramId from the request body
      // In production, you'd get this from req.user.id (from TelegramWebappAuthGuard)
      const telegramId = registerDto.telegramId || (req.user?.id?.toString());
      
      if (!telegramId) {
        throw new HttpException('Telegram ID is required', HttpStatus.BAD_REQUEST);
      }
      
      // Check if user already exists
      const existingUser = await this.usersService.findByTelegramId(telegramId);
      const existingSeller = await this.sellersService.findByTelegramId(telegramId);
      
      if (existingUser || existingSeller) {
        throw new HttpException('User already exists', HttpStatus.CONFLICT);
      }

      // Create user based on role
      if (registerDto.role === 'USER') {
        console.log('Creating user with data:', {
          telegramId,
          phoneNumber: registerDto.phoneNumber,
          language: registerDto.language,
          location: registerDto.location
        });
        
        await this.usersService.create({
          telegramId: telegramId,
          phoneNumber: registerDto.phoneNumber,
          language: registerDto.language,
          role: registerDto.role,
          location: registerDto.location,
        });
      } else if (registerDto.role === 'SELLER') {
        throw new HttpException('Seller registration requires additional steps', HttpStatus.BAD_REQUEST);
      }

      // Login after registration
      console.log('Registration successful, logging in...');
      return await this.authService.login(telegramId, registerDto.role);
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Registration failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }): Promise<{ access_token: string }> {
    try {
      return await this.authService.refreshToken(body.refresh_token);
    } catch (error) {
      throw new HttpException('Token refresh failed', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return {
      user: req.user,
    };
  }

  @Post('telegram')
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    forbidNonWhitelisted: true,
    validateCustomDecorators: true
  }))
  async telegramAuth(@Body() body: { initData: string }): Promise<AuthResponse> {
    try {
      console.log('Telegram authentication attempt with initData:', body.initData?.substring(0, 50) + '...');
      
      if (!body.initData) {
        throw new HttpException('Telegram initData is required', HttpStatus.BAD_REQUEST);
      }
      
      // Parse the initData to extract user information
      const urlParams = new URLSearchParams(body.initData);
      const userParam = urlParams.get('user');
      
      if (!userParam) {
        throw new HttpException('User data not found in initData', HttpStatus.BAD_REQUEST);
      }
      
      const userData = JSON.parse(userParam);
      const telegramId = userData.id.toString();
      
      console.log('Extracted user data:', { telegramId, firstName: userData.first_name });
      
      // Check if user exists in database
      const existingUser = await this.usersService.findByTelegramId(telegramId);
      const existingSeller = await this.sellersService.findByTelegramId(telegramId);
      
      if (existingUser) {
        console.log('Found existing user, logging in as USER');
        return await this.authService.login(telegramId, 'USER');
      } else if (existingSeller) {
        console.log('Found existing seller, logging in as SELLER');
        return await this.authService.login(telegramId, 'SELLER');
      } else {
        // User doesn't exist, they need to register
        throw new HttpException('User not found. Please register first.', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      console.error('Telegram authentication error:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Telegram authentication failed: ${error.message}`, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    // In a more sophisticated setup, you might want to blacklist tokens
    // For now, we'll just return success
    return { message: 'Logged out successfully' };
  }
}
