// src/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Seller } from 'src/sellers/entities/seller.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async createProduct(data: {
    name: string;
    price: number;
    discountPrice?: number;
    seller: Seller;
  }): Promise<Product> {
    const product = this.productsRepository.create(data);
    return this.productsRepository.save(product);
  }

  async findBySeller(sellerId: number): Promise<Product[]> {
    return this.productsRepository.find({ where: { seller: { id: sellerId } } });
  }
}