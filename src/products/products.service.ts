// src/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({
      relations: ['seller'],
      where: { isActive: true },
    });
  }

  async findOne(id: number): Promise<Product | null> {
    return this.productsRepository.findOne({
      where: { id },
      relations: ['seller', 'ratings'],
    });
  }

  async findBySeller(sellerId: number): Promise<Product[]> {
    return this.productsRepository.find({
      where: { seller: { id: sellerId }, isActive: true },
      relations: ['seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveProducts(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { isActive: true },
      relations: ['seller'],
    });
  }

  async update(id: number, updateProductDto: Partial<CreateProductDto>): Promise<Product | null> {
    await this.productsRepository.update(id, updateProductDto);
    return this.findOne(id);
  }

  async deactivate(id: number): Promise<Product | null> {
    await this.productsRepository.update(id, { isActive: false });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.productsRepository.delete(id);
  }
}