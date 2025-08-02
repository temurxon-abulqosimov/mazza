import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([Product]) ], // Add your Product entity here
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
