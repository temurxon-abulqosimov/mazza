import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Req, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { SellersService } from '../../sellers/sellers.service';
import { OrdersService } from '../../orders/orders.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { UserAuthGuard } from '../guard/user.guard';

@Controller('webapp/user-dashboard')
export class WebappUserDashboardController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
    private readonly ordersService: OrdersService,
  ) {}

  // Get user profile
  @Get('profile')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getProfile(@Req() req) {
    try {
      const user = await this.usersService.findByTelegramId(req.user.telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: user.id,
        telegramId: user.telegramId,
        phoneNumber: user.phoneNumber,
        location: user.location,
        language: user.language,
        createdAt: user.createdAt
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update user location
  @Put('location')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async updateLocation(@Req() req, @Body() body: { latitude: number; longitude: number }) {
    try {
      const user = await this.usersService.findByTelegramId(req.user.telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.usersService.update(user.id, {
        location: {
          latitude: body.latitude,
          longitude: body.longitude
        }
      });

      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update location', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get nearby stores
  @Get('nearby-stores')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getNearbyStores(
    @Req() req,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string
  ) {
    try {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = radius ? parseFloat(radius) : 10;

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new HttpException('Invalid coordinates', HttpStatus.BAD_REQUEST);
      }

      const sellers = await this.sellersService.findNearbyStores(latitude, longitude, 50);
      
      const storesWithDistance = sellers
        .map(seller => {
          if (!seller.location) return null;
          
          const distance = calculateDistance(
            latitude,
            longitude,
            seller.location.latitude,
            seller.location.longitude
          );
          
          return {
            ...seller,
            distance,
            isOpen: this.isStoreOpen(seller.opensAt, seller.closesAt)
          };
        })
        .filter(store => store !== null && store.distance <= radiusKm) as Array<{
          distance: number;
          isOpen: boolean;
          [key: string]: any;
        }>;

      // Sort by distance
      storesWithDistance.sort((a, b) => a.distance - b.distance);

      return {
        stores: storesWithDistance,
        total: storesWithDistance.length,
        radius: radiusKm
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get nearby stores', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user orders
  @Get('orders')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getOrders(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    try {
      const user = await this.usersService.findByTelegramId(req.user.telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      const orders = await this.ordersService.findByUser(user.id, limitNum, offset);
      const totalOrders = await this.ordersService.countByUser(user.id);

      return {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalOrders,
          pages: Math.ceil(totalOrders / limitNum)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user statistics
  @Get('stats')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getStats(@Req() req) {
    try {
      const user = await this.usersService.findByTelegramId(req.user.telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const totalOrders = await this.ordersService.countByUser(user.id);
      const totalSpent = await this.ordersService.getTotalSpentByUser(user.id);
      const favoriteStores = await this.ordersService.getFavoriteStoresByUser(user.id);

      return {
        totalOrders,
        totalSpent,
        favoriteStores,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Helper method to check if store is open
  private isStoreOpen(opensAt?: number, closesAt?: number): boolean {
    if (!opensAt || !closesAt) return true;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return currentMinutes >= opensAt && currentMinutes <= closesAt;
  }
}

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}