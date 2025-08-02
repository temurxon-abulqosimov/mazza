// src/bookings/bookings.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
  ) {}

  async createBooking(user: User, product: Product): Promise<Booking> {
    const booking = this.bookingsRepository.create({
      code: uuidv4(),
      user,
      product,
    });
    return this.bookingsRepository.save(booking);
  }

  async findBookingsByUser(userId: number): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'product'],
    });
  }
}