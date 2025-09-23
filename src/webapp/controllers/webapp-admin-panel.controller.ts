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
import { AdminService } from '../../admin/admin.service';
import { SellersService } from '../../sellers/sellers.service';
import { ProductsService } from '../../products/products.service';
import { OrdersService } from '../../orders/orders.service';
import { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { SellerStatus } from '../../common/enums/seller-status.enum';

@Controller('webapp/admin')
export class WebappAdminPanelController {
  constructor(
    private readonly adminService: AdminService,
    private readonly sellersService: SellersService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  // Get admin dashboard statistics
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async getDashboardStats() {
    try {
      const stats = await this.adminService.getStatistics();
      const advancedStats = await this.adminService.getAdvancedStatistics();
      
      return {
        ...stats,
        ...advancedStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch dashboard stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get all sellers with pagination
  @Get('sellers')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async getAllSellers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status: string = 'all'
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      let sellers;
      if (status === 'pending') {
        sellers = await this.adminService.getSellersByStatus(SellerStatus.PENDING);
      } else if (status === 'approved') {
        sellers = await this.adminService.getSellersByStatus(SellerStatus.APPROVED);
      } else if (status === 'rejected') {
        sellers = await this.adminService.getSellersByStatus(SellerStatus.REJECTED);
      } else {
        sellers = await this.adminService.getAllSellers();
      }

      // Pagination
      const startIndex = offset;
      const endIndex = startIndex + limitNum;
      const paginatedSellers = sellers.slice(startIndex, endIndex);

      return {
        sellers: paginatedSellers.map(seller => ({
          id: seller.id,
          telegramId: seller.telegramId,
          phoneNumber: seller.phoneNumber,
          businessName: seller.businessName,
          businessType: seller.businessType,
          status: seller.status,
          language: seller.language,
          createdAt: seller.createdAt,
          stats: {
            totalProducts: seller.products?.length || 0,
            totalOrders: seller.products?.reduce((sum, product) => sum + (product.orders?.length || 0), 0) || 0
          }
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: sellers.length,
          totalPages: Math.ceil(sellers.length / limitNum)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch sellers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update seller status
  @Put('sellers/:id/status')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async updateSellerStatus(@Param('id') id: string, @Body() body: { status: SellerStatus }) {
    try {
      const sellerId = parseInt(id, 10);
      if (isNaN(sellerId)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }

      const updatedSeller = await this.adminService.updateSellerStatus(sellerId, body.status);
      if (!updatedSeller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: updatedSeller.id,
        businessName: updatedSeller.businessName,
        status: updatedSeller.status,
        updatedAt: updatedSeller.updatedAt
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update seller status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get all orders
  @Get('orders')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async getAllOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status: string = 'all'
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      const orders = await this.adminService.getAllOrders();
      
      // Filter by status if specified
      let filteredOrders = orders;
      if (status !== 'all') {
        filteredOrders = orders.filter(order => order.status === status);
      }

      // Pagination
      const startIndex = offset;
      const endIndex = startIndex + limitNum;
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

      return {
        orders: paginatedOrders.map(order => ({
          id: order.id,
          totalPrice: order.totalPrice,
          quantity: order.quantity,
          status: order.status,
          createdAt: order.createdAt,
          user: {
            id: order.user.id,
            telegramId: order.user.telegramId,
            phoneNumber: order.user.phoneNumber
          },
          product: {
            id: order.product.id,
            name: order.product.name,
            price: order.product.price
          },
          seller: {
            id: order.product.seller.id,
            businessName: order.product.seller.businessName,
            businessType: order.product.seller.businessType
          }
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredOrders.length,
          totalPages: Math.ceil(filteredOrders.length / limitNum)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get all products
  @Get('products')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async getAllProducts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status: string = 'all'
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      const products = await this.adminService.getAllProducts();
      
      // Filter by status if specified
      let filteredProducts = products;
      if (status === 'active') {
        filteredProducts = products.filter(product => product.isActive);
      } else if (status === 'inactive') {
        filteredProducts = products.filter(product => !product.isActive);
      }

      // Pagination
      const startIndex = offset;
      const endIndex = startIndex + limitNum;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      return {
        products: paginatedProducts.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          description: product.description,
          isActive: product.isActive,
          quantity: product.quantity,
          createdAt: product.createdAt,
          seller: {
            id: product.seller.id,
            businessName: product.seller.businessName,
            businessType: product.seller.businessType
          },
          stats: {
            totalOrders: product.orders?.length || 0,
            totalRevenue: product.orders?.reduce((sum, order) => sum + order.totalPrice, 0) || 0
          }
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredProducts.length,
          totalPages: Math.ceil(filteredProducts.length / limitNum)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get all users
  @Get('users')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      const users = await this.adminService.getAllUsers();
      
      // Pagination
      const startIndex = offset;
      const endIndex = startIndex + limitNum;
      const paginatedUsers = users.slice(startIndex, endIndex);

      return {
        users: paginatedUsers.map(user => ({
          id: user.id,
          telegramId: user.telegramId,
          phoneNumber: user.phoneNumber,
          language: user.language,
          location: user.location,
          createdAt: user.createdAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: users.length,
          totalPages: Math.ceil(users.length / limitNum)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch users', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete user
  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async deleteUser(@Param('id') id: string) {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
      }

      const success = await this.adminService.deleteUser(userId);
      if (!success) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete seller
  @Delete('sellers/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async deleteSeller(@Param('id') id: string) {
    try {
      const sellerId = parseInt(id, 10);
      if (isNaN(sellerId)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }

      const success = await this.adminService.deleteSeller(sellerId);
      if (!success) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'Seller deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete seller', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete product
  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async deleteProduct(@Param('id') id: string) {
    try {
      const productId = parseInt(id, 10);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }

      const success = await this.adminService.deleteProduct(productId);
      if (!success) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 