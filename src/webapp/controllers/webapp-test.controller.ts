import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';

@Controller('webapp/test')
export class WebappTestController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create-test-user')
  async createTestUser(@Body() body: { telegramId: string; role?: string }) {
    try {
      const { telegramId, role = 'USER' } = body;
      
      // Check if user already exists
      const existingUser = await this.usersService.findByTelegramId(telegramId);
      if (existingUser) {
        return {
          message: 'Test user already exists',
          user: existingUser
        };
      }
      
      // Create test user
      const createUserDto: CreateUserDto = {
        telegramId: telegramId,
        phoneNumber: '+998901234567',
        language: 'uz',
        role: role as 'USER' | 'SELLER' | 'ADMIN'
      };
      
      const user = await this.usersService.create(createUserDto);
      
      return {
        message: 'Test user created successfully',
        user: user
      };
    } catch (error) {
      throw new HttpException('Failed to create test user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
