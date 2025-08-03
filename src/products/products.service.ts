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
    console.log('ProductsService: Creating product with DTO:', createProductDto);
    
    // Create product with explicit sellerId
    const product = this.productsRepository.create({
      price: createProductDto.price,
      originalPrice: createProductDto.originalPrice,
      description: createProductDto.description,
      availableUntil: createProductDto.availableUntil,
      seller: { id: createProductDto.sellerId }
    });
    
    console.log('ProductsService: Created product entity:', product);
    const savedProduct = await this.productsRepository.save(product);
    console.log('ProductsService: Saved product:', savedProduct);
    return savedProduct;
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
    console.log('ProductsService: Finding products for sellerId:', sellerId);
    
    // Try using query builder for more explicit control
    const products = await this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.createdAt', 'DESC')
      .getMany();
    
    console.log('ProductsService: Found products:', products);
    return products;
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