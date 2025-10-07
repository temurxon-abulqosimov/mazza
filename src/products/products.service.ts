// src/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { generateProductCode } from 'src/common/utils/code-generator.util';

@Injectable()
export class ProductsService {
  private cachedCategoryValues: string[] | null = null;
  private lastCategoryFetchAt: number | null = null;

  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  private async getAllowedCategoryValues(): Promise<string[]> {
    try {
      const now = Date.now();
      if (this.cachedCategoryValues && this.lastCategoryFetchAt && (now - this.lastCategoryFetchAt) < 5 * 60 * 1000) {
        return this.cachedCategoryValues;
      }
      // Query Postgres enum labels for product_category_enum
      const rows: Array<{ enumlabel: string }> = await this.productsRepository.manager.query(
        `SELECT e.enumlabel
         FROM pg_type t
         JOIN pg_enum e ON t.oid = e.enumtypid
         JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
         WHERE t.typname = 'product_category_enum'
         ORDER BY e.enumsortorder;`
      );
      const values = rows.map(r => r.enumlabel);
      this.cachedCategoryValues = values;
      this.lastCategoryFetchAt = now;
      return values;
    } catch (err) {
      console.warn('⚠️ Failed to fetch category enum values from DB. Proceeding without normalization.', err?.message || err);
      return [];
    }
  }

  private async normalizeCategory(inputCategory?: string): Promise<string | undefined> {
    const allowed = await this.getAllowedCategoryValues();
    if (!inputCategory) {
      // No input; let DB default apply
      return undefined;
    }
    if (allowed.length === 0) {
      // Could not introspect; pass through to let DB validate or default
      return inputCategory;
    }
    if (allowed.includes(inputCategory)) {
      return inputCategory;
    }
    // Prefer 'other' if present; else first allowed
    const fallback = allowed.includes('other') ? 'other' : allowed[0];
    return fallback;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    console.log('🔧 ProductsService: Creating product with DTO:', createProductDto);
    
    // Validate required fields
    if (!createProductDto.sellerId) {
      throw new Error('Seller ID is required');
    }
    if (!createProductDto.name) {
      throw new Error('Product name is required');
    }
    if (!createProductDto.price) {
      throw new Error('Product price is required');
    }
    
    console.log('🔧 All validations passed, generating product code...');
    
    // Generate unique product code
    let productCode: string = '';
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      productCode = generateProductCode();
      const existingProduct = await this.productsRepository.findOne({
        where: { code: productCode }
      });
      
      if (!existingProduct) {
        isUnique = true;
      } else {
        attempts++;
      }
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique product code after 10 attempts');
    }
    
    console.log('🔧 Generated product code:', productCode);

    // Normalize category safely against DB enum values
    const normalizedCategory = await this.normalizeCategory(createProductDto.category);
    
    // Create product with explicit sellerId and generated code
    const productData = {
      name: createProductDto.name,
      price: createProductDto.price,
      originalPrice: createProductDto.originalPrice,
      description: createProductDto.description,
      availableFrom: createProductDto.availableFrom ? new Date(createProductDto.availableFrom) : undefined,
      availableUntil: new Date(createProductDto.availableUntil),
      quantity: createProductDto.quantity || 1,
      category: normalizedCategory, // either valid enum, fallback, or undefined to use DB default
      isActive: createProductDto.isActive !== undefined ? createProductDto.isActive : true,
      code: productCode,
      seller: { id: createProductDto.sellerId }
    };
    
    console.log('🔧 Product data to create:', productData);
    
    const product = this.productsRepository.create(productData);
    console.log('🔧 Created product entity:', product);
    
    try {
      console.log('🔧 Saving product to database...');
      const savedProduct = await this.productsRepository.save(product);
      console.log('✅ Product created successfully:', savedProduct.id);
      return savedProduct;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        stack: error.stack
      });
      throw error;
    }
  }

  async updateProductCodes(): Promise<void> {
    // Get all products without codes
    const productsWithoutCodes = await this.productsRepository.find({
      where: { code: IsNull() }
    });
    
    console.log(`Found ${productsWithoutCodes.length} products without codes`);
    
    for (const product of productsWithoutCodes) {
      let productCode: string = '';
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        productCode = generateProductCode();
        const existingProduct = await this.productsRepository.findOne({
          where: { code: productCode }
        });
        
        if (!existingProduct) {
          isUnique = true;
        } else {
          attempts++;
        }
      }
      
      if (isUnique) {
        product.code = productCode;
        await this.productsRepository.save(product);
        console.log(`Updated product ${product.id} with code ${productCode}`);
      }
    }
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

  async findBySeller(sellerId: number, limit?: number, offset?: number): Promise<Product[]> {
    console.log('ProductsService: Finding products for sellerId:', sellerId);
    
    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .orderBy('product.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }
    
    const products = await queryBuilder.getMany();
    console.log('ProductsService: Found products:', products);
    return products;
  }

  async findActiveBySeller(sellerId: number, limit?: number, offset?: number): Promise<Product[]> {
    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }
    
    return queryBuilder.getMany();
  }

  async findInactiveBySeller(sellerId: number, limit?: number, offset?: number): Promise<Product[]> {
    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .andWhere('product.isActive = :isActive', { isActive: false })
      .orderBy('product.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }
    
    return queryBuilder.getMany();
  }

  async countBySeller(sellerId: number): Promise<number> {
    return this.productsRepository
      .createQueryBuilder('product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .getCount();
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