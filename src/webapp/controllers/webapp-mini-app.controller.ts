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
  HttpStatus,
  Res 
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from '../../users/users.service';
import { SellersService } from '../../sellers/sellers.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { UserAuthGuard } from '../guard/user.guard';
import { SellerAuthGuard } from '../guard/seller.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { join } from 'path';

@Controller('webapp/mini-app')
export class WebappMiniAppController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
  ) {}

  // Serve React app for mini-app
  @Get()
  serveMiniApp(@Res() res: Response) {
    // In production, this should serve the built React app
    // For development, redirect to React dev server
    if (process.env.NODE_ENV === 'production') {
      // Serve built React app from mazza-frontend/build
      const indexPath = join(__dirname, '..', '..', '..', '..', 'mazza-frontend', 'build', 'index.html');
      return res.sendFile(indexPath);
    } else {
      // Redirect to React dev server in development
      return res.redirect('http://localhost:3001');
    }
  }

  // Get mini app entry point - determines user role and redirects
  @Get('entry')
  @UseGuards(JwtAuthGuard)
  async getEntryPoint(@Req() req) {
    try {
      const { telegramId, role } = req.user;
      
      // Get user details
      const user = await this.usersService.findByTelegramId(telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Determine user type and available features
      let userType = 'USER';
      let features = ['browse_products', 'view_orders', 'view_stats'];
      let dashboard = 'user';

      if (role === 'SELLER') {
        const seller = await this.sellersService.findByTelegramId(telegramId);
        if (seller) {
          userType = 'SELLER';
          features = ['manage_products', 'view_orders', 'view_stats', 'manage_profile'];
          dashboard = 'seller';
          
          if (seller.status === 'pending') {
            features = ['manage_profile']; // Limited features for pending sellers
          }
        }
      } else if (role === 'ADMIN') {
        userType = 'ADMIN';
        features = ['admin_dashboard', 'manage_sellers', 'manage_products', 'manage_orders', 'manage_users'];
        dashboard = 'admin';
      }

      return {
        user: {
          id: user.id,
          telegramId: user.telegramId,
          phoneNumber: user.phoneNumber,
          language: user.language,
          location: user.location
        },
        userType,
        features,
        dashboard,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get entry point', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user dashboard data
  @Get('user-dashboard')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getUserDashboard(@Req() req) {
    try {
      const user = await this.usersService.findByTelegramId(req.user.telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return {
        user: {
          id: user.id,
          telegramId: user.telegramId,
          phoneNumber: user.phoneNumber,
          language: user.language,
          location: user.location,
          createdAt: user.createdAt
        },
        features: [
          'browse_products',
          'view_orders',
          'view_stats',
          'update_profile'
        ],
        quickActions: [
          {
            id: 'browse_products',
            title: 'Browse Products',
            description: 'Find nearby food deals',
            icon: '🍽️',
            route: '/discovery/products'
          },
          {
            id: 'view_orders',
            title: 'My Orders',
            description: 'View order history',
            icon: '📦',
            route: '/user-dashboard/orders'
          },
          {
            id: 'view_stats',
            title: 'Statistics',
            description: 'View your stats',
            icon: '📊',
            route: '/user-dashboard/stats'
          }
        ]
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get user dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get seller dashboard data
  @Get('seller-dashboard')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async getSellerDashboard(@Req() req) {
    try {
      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const features = seller.status === 'approved' 
        ? ['manage_products', 'view_orders', 'view_stats', 'manage_profile']
        : ['manage_profile']; // Limited features for pending sellers

      return {
        seller: {
          id: seller.id,
          telegramId: seller.telegramId,
          phoneNumber: seller.phoneNumber,
          businessName: seller.businessName,
          businessType: seller.businessType,
          status: seller.status,
          language: seller.language,
          location: seller.location,
          createdAt: seller.createdAt
        },
        features,
        quickActions: seller.status === 'approved' ? [
          {
            id: 'manage_products',
            title: 'Manage Products',
            description: 'Add, edit, or delete products',
            icon: '🍕',
            route: '/seller-dashboard/products'
          },
          {
            id: 'view_orders',
            title: 'Orders',
            description: 'View and manage orders',
            icon: '📋',
            route: '/seller-dashboard/orders'
          },
          {
            id: 'view_stats',
            title: 'Statistics',
            description: 'View business statistics',
            icon: '📊',
            route: '/seller-dashboard/stats'
          }
        ] : [
          {
            id: 'manage_profile',
            title: 'Profile',
            description: 'Update your business profile',
            icon: '🏪',
            route: '/seller-dashboard/profile'
          }
        ]
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get seller dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get admin dashboard data
  @Get('admin-dashboard')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async getAdminDashboard(@Req() req) {
    try {
      return {
        features: [
          'admin_dashboard',
          'manage_sellers',
          'manage_products',
          'manage_orders',
          'manage_users'
        ],
        quickActions: [
          {
            id: 'admin_dashboard',
            title: 'Dashboard',
            description: 'View system statistics',
            icon: '📊',
            route: '/admin/dashboard'
          },
          {
            id: 'manage_sellers',
            title: 'Sellers',
            description: 'Manage seller accounts',
            icon: '🏪',
            route: '/admin/sellers'
          },
          {
            id: 'manage_products',
            title: 'Products',
            description: 'Manage all products',
            icon: '🍕',
            route: '/admin/products'
          },
          {
            id: 'manage_orders',
            title: 'Orders',
            description: 'View all orders',
            icon: '📋',
            route: '/admin/orders'
          },
          {
            id: 'manage_users',
            title: 'Users',
            description: 'Manage user accounts',
            icon: '👥',
            route: '/admin/users'
          }
        ]
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get admin dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 