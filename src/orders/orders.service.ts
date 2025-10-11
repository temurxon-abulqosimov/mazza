import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from 'src/webapp/gateways/realtime.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { generateOrderCode } from 'src/common/utils/code-generator.util';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private realtime: RealtimeGateway,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // First get the product to get its price
    const product = await this.ordersRepository.manager.getRepository('product').findOne({
      where: { id: createOrderDto.productId }
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Get the user to ensure it exists
    const user = await this.ordersRepository.manager.getRepository('user').findOne({
      where: { id: createOrderDto.userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Calculate total price if not provided
    const totalPrice = createOrderDto.totalPrice || (product.price * createOrderDto.quantity);
    
    // Generate confirmation code
    const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const order = this.ordersRepository.create({
      code: generateOrderCode(),
      totalPrice: totalPrice,
      quantity: createOrderDto.quantity,
      status: createOrderDto.status || OrderStatus.PENDING,
      confirmationCode,
      user: { id: createOrderDto.userId },
      product: { id: createOrderDto.productId }
    });
    
    const savedOrder = await this.ordersRepository.save(order);
    
    // Return the order with all relations loaded
    const loadedOrder = await this.findOne(savedOrder.id);
    if (!loadedOrder) {
      throw new Error('Failed to load created order');
    }
    // Emit to seller room about new order
    try {
      const sellerId = loadedOrder.product?.seller?.id;
      if (sellerId) this.realtime.emitToSeller(sellerId, 'orderCreated', loadedOrder);
    } catch {}

    return loadedOrder;
  }

  async createWithTelegramId(telegramId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    // Find user by telegram ID
    const user = await this.usersRepository.findOne({
      where: { telegramId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return this.create({ ...createOrderDto, userId: user.id });
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['user', 'product', 'product.seller'],
    });
  }

  async findOne(id: number): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { id },
      relations: ['user', 'product', 'product.seller'],
    });
  }

  async findByUser(userId: number, limit?: number, offset?: number): Promise<Order[]> {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('order.user.id = :userId', { userId })
      .orderBy('order.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }

    return queryBuilder.getMany();
  }

  async findByUserTelegramId(telegramId: string): Promise<Order[]> {
    const user = await this.usersRepository.findOne({
      where: { telegramId }
    });
    
    if (!user) {
      return [];
    }
    
    return this.findByUser(user.id);
  }

  async findBySeller(sellerId: number, limit?: number, offset?: number): Promise<Order[]> {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .orderBy('order.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }

    return queryBuilder.getMany();
  }

  async findPendingBySeller(sellerId: number, limit?: number, offset?: number): Promise<Order[]> {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .andWhere('order.status = :status', { status: OrderStatus.PENDING })
      .orderBy('order.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }

    return queryBuilder.getMany();
  }

  async findCompletedBySeller(sellerId: number, limit?: number, offset?: number): Promise<Order[]> {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .andWhere('order.status = :status', { status: OrderStatus.CONFIRMED })
      .orderBy('order.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }

    return queryBuilder.getMany();
  }

  async countBySeller(sellerId: number): Promise<number> {
    return this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .getCount();
  }

  async countByUser(userId: number): Promise<number> {
    return this.ordersRepository
      .createQueryBuilder('order')
      .where('order.user.id = :userId', { userId })
      .getCount();
  }

  async countPendingBySeller(sellerId: number): Promise<number> {
    return this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .andWhere('order.status = :status', { status: OrderStatus.PENDING })
      .getCount();
  }

  async getTotalRevenueBySeller(sellerId: number): Promise<number> {
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .andWhere('order.status = :status', { status: OrderStatus.CONFIRMED })
      .select('SUM(order.totalPrice)', 'total')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  async getTotalSpentByUser(userId: number): Promise<number> {
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.user.id = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.CONFIRMED })
      .select('SUM(order.totalPrice)', 'total')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  async getFavoriteStoresByUser(userId: number): Promise<any[]> {
    return this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('order.user.id = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.CONFIRMED })
      .select('seller.id', 'sellerId')
      .addSelect('seller.businessName', 'businessName')
      .addSelect('COUNT(*)', 'orderCount')
      .groupBy('seller.id, seller.businessName')
      .orderBy('orderCount', 'DESC')
      .limit(5)
      .getRawMany();
  }

  async findByCode(code: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { code },
      relations: ['user', 'product', 'product.seller'],
    });
  }

  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order | null> {
    await this.ordersRepository.update(id, updateOrderDto);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order | null> {
    // Update the order status first
    await this.ordersRepository.update(id, { status });
    const updated = await this.findOne(id);

    // If seller confirmed the order, reduce product quantity and deactivate when empty
    if (updated && status === OrderStatus.CONFIRMED) {
      const productRepo = this.ordersRepository.manager.getRepository(Product);
      // Reload product with current quantity
      const product = await productRepo.findOne({ where: { id: updated.product.id } });
      if (product) {
        const orderQty = typeof updated.quantity === 'number' ? updated.quantity : 1;
        const currentQty = typeof product.quantity === 'number' ? product.quantity : 1;
        const remaining = Math.max(0, currentQty - orderQty);
        if (remaining <= 0) {
          await productRepo.update(product.id, { quantity: 0, isActive: false });
        } else {
          await productRepo.update(product.id, { quantity: remaining });
        }
      }
    }
    try {
      const sellerId = updated?.product?.seller?.id;
      if (sellerId) this.realtime.emitToSeller(sellerId, 'orderStatusChanged', updated);
      const userId = updated?.user?.id;
      if (userId) this.realtime.emitToUser(userId, 'orderStatusChanged', updated);
    } catch {}
    return updated;
  }

  async remove(id: number): Promise<void> {
    await this.ordersRepository.delete(id);
  }
}
