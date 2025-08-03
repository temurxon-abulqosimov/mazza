import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { generateOrderCode } from 'src/common/utils/code-generator.util';
import { OrderStatus } from 'src/common/enums/order-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = this.ordersRepository.create({
      ...createOrderDto,
      code: generateOrderCode(),
      totalPrice: 0, // Will be set from product price
    });
    return this.ordersRepository.save(order);
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

  async findByUser(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: ['product', 'product.seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(sellerId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { product: { seller: { id: sellerId } } },
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCode(code: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { code },
      relations: ['user', 'product', 'product.seller'],
    });
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order | null> {
    await this.ordersRepository.update(id, { status });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.ordersRepository.delete(id);
  }
} 