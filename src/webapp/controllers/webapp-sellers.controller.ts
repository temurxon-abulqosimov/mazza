import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Query, 
  Body, 
  UseGuards, 
  Req, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { SellersService } from '../../sellers/sellers.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { SellerAuthGuard } from '../guard/seller.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { AdminOrSellerGuard } from '../guard/adminOrSeller.guard';
import { CreateSellerDto } from '../../sellers/dto/create-seller.dto';
import { UpdateSellerDto } from '../../sellers/dto/update-seller.dto';
import { SellerStatus } from '../../common/enums/seller-status.enum';
import { AdminService } from '../../admin/admin.service';
import { BotService } from '../../bot/bot.service';
import { envVariables } from '../../config/env.variables';

@Controller('webapp/sellers')
export class WebappSellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly adminService: AdminService,
    private readonly botService: BotService
  ) {}

  // Public endpoints
  @Get()
  async findAll() {
    try {
      return await this.sellersService.findApprovedSellers();
    } catch (error) {
      throw new HttpException('Failed to fetch sellers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('nearby')
  async findNearby(@Query('lat') lat: string, @Query('lng') lng: string) {
    try {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new HttpException('Invalid coordinates', HttpStatus.BAD_REQUEST);
      }
      
      return await this.sellersService.findNearbyStores(latitude, longitude);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch nearby sellers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const sellerId = parseInt(id, 10);
      if (isNaN(sellerId)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      
      const seller = await this.sellersService.findOne(sellerId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      
      return seller;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Admin-only endpoints
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findAllSellers() {
    try {
      return await this.sellersService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch all sellers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('admin/telegram/:telegramId')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findByTelegramId(@Param('telegramId') telegramId: string) {
    try {
      const seller = await this.sellersService.findByTelegramId(telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      return seller;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req, @Body() createSellerDto: CreateSellerDto) {
    try {
      const telegramId = req.user.telegramId;
      createSellerDto.telegramId = telegramId;
      
      const newSeller = await this.sellersService.create(createSellerDto);
      
      // Send notification to admin
      await this.notifyAdminAboutNewSeller(newSeller);
      
      return newSeller;
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        throw new HttpException('Seller already exists with this Telegram ID', HttpStatus.CONFLICT);
      }
      throw new HttpException('Failed to create seller', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async update(@Param('id') id: string, @Req() req, @Body() updateSellerDto: UpdateSellerDto) {
    try {
      const sellerId = parseInt(id, 10);
      if (isNaN(sellerId)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingSeller = await this.sellersService.findOne(sellerId);
      if (!existingSeller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      if (existingSeller.telegramId !== telegramId) {
        throw new HttpException('You can only update your own seller profile', HttpStatus.FORBIDDEN);
      }
      
      return await this.sellersService.update(sellerId, updateSellerDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update seller', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async updateStatus(@Param('id') id: string, @Body() body: { status: SellerStatus }) {
    try {
      const sellerId = parseInt(id, 10);
      if (isNaN(sellerId)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      
      if (!Object.values(SellerStatus).includes(body.status)) {
        throw new HttpException('Invalid seller status', HttpStatus.BAD_REQUEST);
      }
      
      return await this.sellersService.updateStatus(sellerId, body.status);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update seller status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/language')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async updateLanguage(@Param('id') id: string, @Req() req, @Body() body: { language: 'uz' | 'ru' }) {
    try {
      const sellerId = parseInt(id, 10);
      if (isNaN(sellerId)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingSeller = await this.sellersService.findOne(sellerId);
      if (!existingSeller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      if (existingSeller.telegramId !== telegramId) {
        throw new HttpException('You can only update your own language preference', HttpStatus.FORBIDDEN);
      }
      
      if (!['uz', 'ru'].includes(body.language)) {
        throw new HttpException('Invalid language. Must be uz or ru', HttpStatus.BAD_REQUEST);
      }
      
      return await this.sellersService.updateLanguage(telegramId, body.language);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update language', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminOrSellerGuard)
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const sellerId = parseInt(id, 10);
      if (isNaN(sellerId)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingSeller = await this.sellersService.findOne(sellerId);
      if (!existingSeller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      
      // Admin can delete any seller
      if (req.user.role === 'ADMIN') {
        return await this.sellersService.updateStatus(sellerId, SellerStatus.REJECTED);
      }
      
      // Seller can only delete their own profile
      if (req.user.role === 'SELLER' && existingSeller.telegramId !== telegramId) {
        throw new HttpException('You can only delete your own seller profile', HttpStatus.FORBIDDEN);
      }
      
      return await this.sellersService.updateStatus(sellerId, SellerStatus.REJECTED);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete seller', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async notifyAdminAboutNewSeller(seller: any) {
    try {
      console.log('🔔 Attempting to notify admin about new seller:', seller.businessName);
      
      // Get admin telegram ID from environment
      const adminTelegramId = envVariables.ADMIN_TELEGRAM_ID;
      console.log('Admin Telegram ID:', adminTelegramId);
      
      // Get notification message
      const message = this.adminService.getNewSellerNotificationMessage(seller);
      console.log('Notification message:', message);
      
      // Send notification via bot
      await this.botService.sendMessageToAdmin(adminTelegramId, message);
      
      console.log('✅ Admin notified about new seller:', seller.businessName);
    } catch (error) {
      console.error('❌ Failed to notify admin:', error);
      console.error('Error details:', error.message);
    }
  }
}
