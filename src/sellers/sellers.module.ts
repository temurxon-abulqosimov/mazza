// src/sellers/sellers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellersService } from './sellers.service';
import { Seller } from './entities/seller.entity';
import { RatingsModule } from 'src/ratings/ratings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Seller]), RatingsModule],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}