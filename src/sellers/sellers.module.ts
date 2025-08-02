// src/sellers/sellers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellersService } from './sellers.service';
import { Seller } from './entities/seller.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Seller])],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}