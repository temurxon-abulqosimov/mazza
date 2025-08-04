import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { Admin } from './entities/admin.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { Rating } from '../ratings/entities/rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Seller, User, Product, Order, Rating])],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {} 