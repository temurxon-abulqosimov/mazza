import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { User } from 'src/users/entities/user.entity';
import { Seller } from 'src/sellers/entities/seller.entity';
import { Product } from 'src/products/entities/product.entity';
import { generateBookingCode } from 'src/common/utils/code-generator';
import { LessThan } from 'typeorm'; 


@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Seller)
    private sellerRepository: Repository<Seller>,

    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    const user = await this.userRepository.findOne({ where: { id: createBookingDto.userId } });
    const seller = await this.sellerRepository.findOne({ where: { id: createBookingDto.sellerId } });
    const product = await this.productRepository.findOne({ where: { id: createBookingDto.productId } });

    if (!user || !seller || !product) {
      throw new NotFoundException('User, Seller, or Product not found');
    }

    const booking = this.bookingRepository.create({
      user,
      seller,
      product,
      code: generateBookingCode(),
    });

    return await this.bookingRepository.save(booking);
  }

  async findByUser(userId: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { user: { id: userId } },
      relations: ['seller', 'product'],
    });
  }

  async findBySeller(sellerId: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { seller: { id: sellerId } },
      relations: ['user', 'product'],
    });
  }

  async cancelBooking(bookingId: number, userId: number): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['user'],
    });

    if (!booking || booking.user.id !== userId) {
      throw new BadRequestException('Booking not found or not owned by user');
    }

    await this.bookingRepository.delete(bookingId);
  }

  async confirmBySeller(bookingId: number, sellerId: number, code: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['seller'],
    });

    if (!booking || booking.seller.id !== sellerId) {
      throw new BadRequestException('Booking not found or not owned by seller');
    }

    if (booking.code !== code) {
      throw new BadRequestException('Incorrect code');
    }

    booking.isConfirmedBySeller = true;
    return await this.bookingRepository.save(booking);
  }

  async expireOldBookings(hours: number): Promise<void> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - hours);
  
    const oldBookings = await this.bookingRepository.find({
      where: {
        bookedAt: LessThan(threshold),
        isConfirmedBySeller: false,
      },
    });

    for (const booking of oldBookings) {
      await this.bookingRepository.delete(booking.id);
    }
  }
}
