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
import { OrdersService } from '../../orders/orders.service';
import { ProductsService } from '../../products/products.service';
import { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { UserAuthGuard } from '../guard/user.guard';
import { SellerAuthGuard } from '../guard/seller.guard';
import { CreateOrderDto } from '../../orders/dto/create-order.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Controller('webapp/orders')
export class WebappOrderManagementController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
  ) {}

  // Create order
  @Post()
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async createOrder(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    try {
      const user = await this.usersService.findByTelegramId(req.user.telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Get product details
      const product = await this.productsService.findOne(createOrderDto.productId);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      // Check if product is available
      if (product.quantity < createOrderDto.quantity) {
        throw new HttpException('Insufficient quantity available', HttpStatus.BAD_REQUEST);
      }

      // Calculate total price
      const totalPrice = product.price * createOrderDto.quantity;

      // Create order
      const order = await this.ordersService.create({
        ...createOrderDto,
        userId: user.id,
        totalPrice,
        status: OrderStatus.PENDING
      });

      // Update product quantity
      await this.productsService.update(product.id, {
        quantity: product.quantity - createOrderDto.quantity
      });

      return {
        success: true,
        order: {
          id: order.id,
          code: order.code,
          totalPrice: order.totalPrice,
          quantity: order.quantity,
          status: order.status,
          confirmationCode: order.confirmationCode,
          createdAt: order.createdAt
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to create order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get order by ID
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Param('id') id: string) {
    try {
      const order = await this.ordersService.findOne(parseInt(id));
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      return order;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Cancel order
  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async cancelOrder(@Param('id') id: string, @Req() req) {
    try {
      const order = await this.ordersService.findOne(parseInt(id));
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      // Check if user owns this order
      const user = await this.usersService.findByTelegramId(req.user.telegramId);
      if (!user || order.user.id !== user.id) {
        throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
      }

      // Check if order can be cancelled
      if (order.status !== OrderStatus.PENDING) {
        throw new HttpException('Order cannot be cancelled', HttpStatus.BAD_REQUEST);
      }

      await this.ordersService.updateStatus(parseInt(id), OrderStatus.CANCELLED);

      // Restore product quantity
      await this.productsService.update(order.product.id, {
        quantity: order.product.quantity + order.quantity
      });

      return {
        success: true,
        message: 'Order cancelled successfully'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to cancel order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Confirm order (by seller)
  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async confirmOrder(@Param('id') id: string, @Body() body: { confirmationCode: string }, @Req() req) {
    try {
      const order = await this.ordersService.findOne(parseInt(id));
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      // Check confirmation code
      if (body.confirmationCode !== order.confirmationCode) {
        throw new HttpException('Invalid confirmation code', HttpStatus.BAD_REQUEST);
      }

      await this.ordersService.updateStatus(parseInt(id), OrderStatus.CONFIRMED);

      return {
        success: true,
        message: 'Order confirmed successfully'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to confirm order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 