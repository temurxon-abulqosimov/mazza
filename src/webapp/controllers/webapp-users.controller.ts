import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Req, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { SellersService } from '../../sellers/sellers.service';
import { AdminService } from '../../admin/admin.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { UserAuthGuard } from '../guard/user.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { AdminOrUserGuard } from '../guard/userOrAdmin.guard';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';

@Controller('webapp/users')
export class WebappUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
    private readonly adminService: AdminService
  ) {}

  // Admin-only endpoints
  @Get()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findAll() {
    try {
      return await this.usersService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch users', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('admin/telegram/:telegramId')
  // @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findByTelegramId(@Param('telegramId') telegramId: string) {
    try {
      // Check all three tables to determine user's role
      const [user, seller] = await Promise.all([
        this.usersService.findByTelegramId(telegramId),
        this.sellersService.findByTelegramId(telegramId)
      ]);
      
      // Check if user is admin (based on environment variables)
      const isAdmin = await this.adminService.isAdmin(telegramId);

      if (isAdmin) {
        return {
          id: 1,
          telegramId: telegramId,
          role: 'ADMIN'
        };
      } else if (user) {
        return {
          ...user,
          role: 'USER'
        };
      } else if (seller) {
        return {
          ...seller,
          role: 'SELLER'
        };
      } else {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findOne(@Param('id') id: string) {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
      }
      
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // User-only endpoints
  @Get('me')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getCurrentUser(@Req() req) {
    try {
      const telegramId = req.user.telegramId;
      const user = await this.usersService.findByTelegramId(telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch current user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req, @Body() createUserDto: CreateUserDto) {
    try {
      const telegramId = req.user.telegramId;
      createUserDto.telegramId = telegramId;
      
      const existingUser = await this.usersService.findByTelegramId(telegramId);
      if (existingUser) {
        throw new HttpException('User already exists with this Telegram ID', HttpStatus.CONFLICT);
      }
      
      return await this.usersService.create(createUserDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.message && error.message.includes('already exists')) {
        throw new HttpException('User already exists with this Telegram ID', HttpStatus.CONFLICT);
      }
      throw new HttpException('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async update(@Param('id') id: string, @Req() req, @Body() updateUserDto: UpdateUserDto) {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingUser = await this.usersService.findOne(userId);
      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      if (existingUser.telegramId !== telegramId) {
        throw new HttpException('You can only update your own profile', HttpStatus.FORBIDDEN);
      }
      
      return await this.usersService.update(userId, updateUserDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async partialUpdate(@Param('id') id: string, @Req() req, @Body() updateUserDto: Partial<UpdateUserDto>) {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingUser = await this.usersService.findOne(userId);
      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      if (existingUser.telegramId !== telegramId) {
        throw new HttpException('You can only update your own profile', HttpStatus.FORBIDDEN);
      }
      
      return await this.usersService.update(userId, updateUserDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async updateCurrentUser(@Req() req, @Body() updateUserDto: Partial<UpdateUserDto>) {
    try {
      const telegramId = req.user.telegramId;
      const user = await this.usersService.findByTelegramId(telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.usersService.update(user.id, updateUserDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminOrUserGuard)
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingUser = await this.usersService.findOne(userId);
      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      
      // Admin can delete any user
      if (req.user.role === 'ADMIN') {
        await this.usersService.remove(userId);
        return { message: 'User deleted successfully' };
      }
      
      // User can only delete their own profile
      if (req.user.role === 'USER' && existingUser.telegramId !== telegramId) {
        throw new HttpException('You can only delete your own profile', HttpStatus.FORBIDDEN);
      }
      
      await this.usersService.remove(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
