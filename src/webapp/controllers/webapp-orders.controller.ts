import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  UseGuards, 
  Req, 
  Param, 
  Patch, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { SellersService } from '../../sellers/sellers.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { UserAuthGuard } from '../guard/user.guard';
import { SellerAuthGuard } from '../guard/seller.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { AdminOrSellerGuard } from '../guard/adminOrSeller.guard';
import { AdminOrUserGuard } from '../guard/userOrAdmin.guard';
import { CreateOrderDto } from '../../orders/dto/create-order.dto';
import { UpdateOrderDto } from '../../orders/dto/update-order.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Controller('webapp/orders')
export class WebappOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly sellersService: SellersService,
  ) {}

  // Admin-only endpoints
  @Get()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findAll() {
    try {
      return await this.ordersService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('admin/seller/:sellerId')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findBySeller(@Param('sellerId') sellerId: string) {
    try {
      const sellerIdNum = parseInt(sellerId, 10);
      if (isNaN(sellerIdNum)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      return await this.ordersService.findBySeller(sellerIdNum);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Seller-only endpoints
  @Get('seller/my')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async findMySellerOrders(@Req() req) {
    try {
      const telegramId = req.user.telegramId;
      
      const seller = await this.sellersService.findByTelegramId(telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.ordersService.findBySeller(seller.id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch your orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // User-only endpoints
  @Get('user/:telegramId')
  @UseGuards(JwtAuthGuard, AdminOrUserGuard)
  async findByUser(@Param('telegramId') telegramId: string) {
    try {
      return await this.ordersService.findByUserTelegramId(telegramId);
    } catch (error) {
      throw new HttpException('Failed to fetch user orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async findMyOrders(@Req() req) {
    try {
      const telegramId = req.user.telegramId;
      return await this.ordersService.findByUserTelegramId(telegramId);
    } catch (error) {
      throw new HttpException('Failed to fetch your orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('code/:code')
  @UseGuards(JwtAuthGuard, AdminOrUserGuard)
  async findByCode(@Param('code') code: string) {
    try {
      const order = await this.ordersService.findByCode(code);
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      return order;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminOrUserGuard)
  async findOne(@Param('id') id: string) {
    try {
      const orderId = parseInt(id, 10);
      if (isNaN(orderId)) {
        throw new HttpException('Invalid order ID', HttpStatus.BAD_REQUEST);
      }
      
      const order = await this.ordersService.findOne(orderId);
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      
      return order;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async create(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    try {
      const telegramId = req.user.telegramId;
      return await this.ordersService.createWithTelegramId(telegramId, createOrderDto);
    } catch (error) {
      if (error.message && (error.message.includes('User not found') || error.message.includes('Product not found'))) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to create order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async update(@Param('id') id: string, @Req() req, @Body() updateOrderDto: UpdateOrderDto) {
    try {
      const orderId = parseInt(id, 10);
      if (isNaN(orderId)) {
        throw new HttpException('Invalid order ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingOrder = await this.ordersService.findOne(orderId);
      if (!existingOrder) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      if (existingOrder.user.telegramId !== telegramId) {
        throw new HttpException('You can only update your own orders', HttpStatus.FORBIDDEN);
      }
      
      if (existingOrder.status !== OrderStatus.PENDING) {
        throw new HttpException('You can only update pending orders', HttpStatus.BAD_REQUEST);
      }
      
      return await this.ordersService.update(orderId, updateOrderDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminOrSellerGuard)
  async updateStatus(@Param('id') id: string, @Body() body: { status: OrderStatus }) {
    try {
      const orderId = parseInt(id, 10);
      if (isNaN(orderId)) {
        throw new HttpException('Invalid order ID', HttpStatus.BAD_REQUEST);
      }
      
      if (!Object.values(OrderStatus).includes(body.status)) {
        throw new HttpException('Invalid order status', HttpStatus.BAD_REQUEST);
      }
      
      // Treat any request to set completed as confirmed (single-step flow)
      const normalizedStatus = body.status === ("completed" as any) ? OrderStatus.CONFIRMED : body.status;
      const updatedOrder = await this.ordersService.updateStatus(orderId, normalizedStatus);
      
      if (!updatedOrder) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        message: 'Order status updated successfully',
        order: {
          id: updatedOrder.id,
          code: updatedOrder.code,
          status: updatedOrder.status,
          totalPrice: updatedOrder.totalPrice,
          quantity: updatedOrder.quantity,
          updatedAt: updatedOrder.updatedAt
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update order status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const orderId = parseInt(id, 10);
      if (isNaN(orderId)) {
        throw new HttpException('Invalid order ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingOrder = await this.ordersService.findOne(orderId);
      if (!existingOrder) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      if (existingOrder.user.telegramId !== telegramId) {
        throw new HttpException('You can only delete your own orders', HttpStatus.FORBIDDEN);
      }
      
      if (existingOrder.status === OrderStatus.CONFIRMED) {
        throw new HttpException('Cannot delete completed or confirmed orders', HttpStatus.BAD_REQUEST);
      }
      
      await this.ordersService.remove(orderId);
      return { message: 'Order deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
