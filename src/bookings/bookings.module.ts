import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { User } from 'src/users/entities/user.entity';
import { Seller } from 'src/sellers/entities/seller.entity';
import { Product } from 'src/products/entities/product.entity';


@Module({
  imports: [ TypeOrmModule.forFeature([Booking, User, Seller, Product]), ],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
