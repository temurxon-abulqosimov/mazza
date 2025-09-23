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
import { SellersService } from '../../sellers/sellers.service';
import { ProductsService } from '../../products/products.service';
import { OrdersService } from '../../orders/orders.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { SellerAuthGuard } from '../guard/seller.guard';
import { CreateProductDto } from '../../products/dto/create-product.dto';
import { UpdateProductDto } from '../../products/dto/update-product.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';


@Controller('webapp/seller-dashboard')
export class WebappSellerDashboardController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {}

  // Get seller profile
  @Get('profile')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async getProfile(@Req() req) {
    try {
      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: seller.id,
        telegramId: seller.telegramId,
        phoneNumber: seller.phoneNumber,
        businessName: seller.businessName,
        businessType: seller.businessType,
        location: seller.location,
        opensAt: seller.opensAt,
        closesAt: seller.closesAt,
        status: seller.status,
        language: seller.language,
        imageUrl: seller.imageUrl,
        createdAt: seller.createdAt
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update seller profile
  @Put('profile')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async updateProfile(@Req() req, @Body() updateData: any) {
    try {
      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const updatedSeller = await this.sellersService.update(seller.id, updateData);
      return updatedSeller;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get seller's products
  @Get('products')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async getProducts(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status: string = 'all'
  ) {
    try {
      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      let products;
      if (status === 'active') {
        products = await this.productsService.findActiveBySeller(seller.id, limitNum, offset);
      } else if (status === 'inactive') {
        products = await this.productsService.findInactiveBySeller(seller.id, limitNum, offset);
      } else {
        products = await this.productsService.findBySeller(seller.id, limitNum, offset);
      }

      const totalProducts = await this.productsService.countBySeller(seller.id);

      return {
        products: products.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          description: product.description,
          imageUrl: product.imageUrl,
          category: product.category,
          isActive: product.isActive,
          quantity: product.quantity,
          availableUntil: product.availableUntil,
          createdAt: product.createdAt,
          stats: {
            totalOrders: product.orders?.length || 0,
            totalRevenue: product.orders?.reduce((sum, order) => sum + order.totalPrice, 0) || 0
          }
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalProducts,
          totalPages: Math.ceil(totalProducts / limitNum)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Create new product
  @Post('products')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async createProduct(@Req() req, @Body() createProductDto: CreateProductDto) {
    try {
      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      createProductDto.sellerId = seller.id;
      const product = await this.productsService.create(createProductDto);
      
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        description: product.description,
        imageUrl: product.imageUrl,
        category: product.category,
        isActive: product.isActive,
        quantity: product.quantity,
        availableUntil: product.availableUntil,
        createdAt: product.createdAt
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to create product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update product
  @Put('products/:id')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async updateProduct(@Param('id') id: string, @Req() req, @Body() updateProductDto: UpdateProductDto) {
    try {
      const productId = parseInt(id, 10);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }

      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const existingProduct = await this.productsService.findOne(productId);
      if (!existingProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      if (existingProduct.seller.id !== seller.id) {
        throw new HttpException('You can only update your own products', HttpStatus.FORBIDDEN);
      }

      const updatedProduct = await this.productsService.update(productId, updateProductDto);
      if (!updatedProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      
      return {
        id: updatedProduct.id,
        name: updatedProduct.name,
        price: updatedProduct.price,
        originalPrice: updatedProduct.originalPrice,
        description: updatedProduct.description,
        imageUrl: updatedProduct.imageUrl,
        category: updatedProduct.category,
        isActive: updatedProduct.isActive,
        quantity: updatedProduct.quantity,
        availableUntil: updatedProduct.availableUntil,
        updatedAt: updatedProduct.updatedAt
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete product
  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async deleteProduct(@Param('id') id: string, @Req() req) {
    try {
      const productId = parseInt(id, 10);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }

      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const existingProduct = await this.productsService.findOne(productId);
      if (!existingProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      if (existingProduct.seller.id !== seller.id) {
        throw new HttpException('You can only delete your own products', HttpStatus.FORBIDDEN);
      }

      await this.productsService.deactivate(productId);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get seller's orders
  @Get('orders')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async getOrders(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status: string = 'all'
  ) {
    try {
      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      let orders;
      if (status === 'pending') {
        orders = await this.ordersService.findPendingBySeller(seller.id, limitNum, offset);
      } else if (status === 'completed') {
        orders = await this.ordersService.findCompletedBySeller(seller.id, limitNum, offset);
      } else {
        orders = await this.ordersService.findBySeller(seller.id, limitNum, offset);
      }

      const totalOrders = await this.ordersService.countBySeller(seller.id);

      return {
        orders: orders.map(order => ({
          id: order.id,
          totalPrice: order.totalPrice,
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
            price: order.product.price,
            imageUrl: order.product.imageUrl
          }
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalOrders,
          totalPages: Math.ceil(totalOrders / limitNum)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update order status
  @Put('orders/:id/status')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }, @Req() req) {
    try {
      const orderId = parseInt(id, 10);
      if (isNaN(orderId)) {
        throw new HttpException('Invalid order ID', HttpStatus.BAD_REQUEST);
      }

      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const order = await this.ordersService.findOne(orderId);
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      if (order.product.seller.id !== seller.id) {
        throw new HttpException('You can only update orders for your products', HttpStatus.FORBIDDEN);
      }

      const updatedOrder = await this.ordersService.updateStatus(orderId, body.status as OrderStatus);
      
      if (!updatedOrder) {
        throw new HttpException('Failed to update order', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      return {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update order status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get seller statistics
  @Get('stats')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async getSellerStats(@Req() req) {
    try {
      const seller = await this.sellersService.findByTelegramId(req.user.telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      const totalProducts = await this.productsService.countBySeller(seller.id);
      const totalOrders = await this.ordersService.countBySeller(seller.id);
      const totalRevenue = await this.ordersService.getTotalRevenueBySeller(seller.id);
      const pendingOrders = await this.ordersService.countPendingBySeller(seller.id);

      return {
        totalProducts,
        totalOrders,
        totalRevenue,
        pendingOrders,
        businessName: seller.businessName,
        businessType: seller.businessType,
        status: seller.status,
        memberSince: seller.createdAt
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 