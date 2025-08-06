import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private ratingsRepository: Repository<Rating>,
  ) {}

  async create(createRatingDto: CreateRatingDto): Promise<Rating> {
    const rating = this.ratingsRepository.create(createRatingDto);
    return this.ratingsRepository.save(rating);
  }

  async findAll(): Promise<Rating[]> {
    return this.ratingsRepository.find({
      relations: ['user', 'product', 'seller'],
    });
  }

  async findOne(id: number): Promise<Rating | null> {
    return this.ratingsRepository.findOne({
      where: { id },
      relations: ['user', 'product', 'seller'],
    });
  }

  async findByProduct(productId: number): Promise<Rating[]> {
    return this.ratingsRepository.find({
      where: { product: { id: productId }, type: 'product' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(sellerId: number): Promise<Rating[]> {
    return this.ratingsRepository.find({
      where: { seller: { id: sellerId }, type: 'seller' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<Rating[]> {
    return this.ratingsRepository.find({
      where: { user: { id: userId } },
      relations: ['product', 'seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAverageRatingByProduct(productId: number): Promise<number> {
    const result = await this.ratingsRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .where('rating.product.id = :productId', { productId })
      .andWhere('rating.type = :type', { type: 'product' })
      .getRawOne();

    return result?.average ? parseFloat(result.average) : 0;
  }

  async getAverageRatingBySeller(sellerId: number): Promise<number> {
    const result = await this.ratingsRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .where('rating.seller.id = :sellerId', { sellerId })
      .andWhere('rating.type = :type', { type: 'seller' })
      .getRawOne();

    return result?.average ? parseFloat(result.average) : 0;
  }

  async getSellerRatingCount(sellerId: number): Promise<number> {
    return this.ratingsRepository.count({
      where: { seller: { id: sellerId }, type: 'seller' }
    });
  }

  async hasUserRatedSeller(userId: number, sellerId: number): Promise<boolean> {
    const count = await this.ratingsRepository.count({
      where: { 
        user: { id: userId }, 
        seller: { id: sellerId }, 
        type: 'seller' 
      }
    });
    return count > 0;
  }

  async update(id: number, updateRatingDto: Partial<CreateRatingDto>): Promise<Rating | null> {
    await this.ratingsRepository.update(id, updateRatingDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.ratingsRepository.delete(id);
  }
} 