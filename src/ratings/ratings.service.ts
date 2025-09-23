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
    console.log('Creating rating with DTO:', createRatingDto);
    
    // Create rating using repository.create() method
    const rating = this.ratingsRepository.create({
      rating: createRatingDto.rating,
      comment: createRatingDto.comment,
      type: createRatingDto.type || 'product',
      user: { id: createRatingDto.userId },
      product: createRatingDto.productId ? { id: createRatingDto.productId } : undefined,
      seller: createRatingDto.sellerId ? { id: createRatingDto.sellerId } : undefined,
    });

    console.log('Rating entity to save:', rating);
    
    const savedRating = await this.ratingsRepository.save(rating);
    
    console.log('Rating saved successfully:', savedRating);
    
    return savedRating;
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
      where: { product: { id: productId } },
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

  async findBySeller(sellerId: number): Promise<Rating[]> {
    return this.ratingsRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.user', 'user')
      .leftJoinAndSelect('rating.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('rating.seller.id = :sellerId OR product.seller.id = :sellerId', { sellerId })
      .orderBy('rating.createdAt', 'DESC')
      .getMany();
  }

  async getAverageRatingByProduct(productId: number): Promise<number> {
    const result = await this.ratingsRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .where('rating.product.id = :productId', { productId })
      .getRawOne();

    return result?.average ? parseFloat(result.average) : 0;
  }

  async getAverageRatingBySeller(sellerId: number): Promise<number> {
    console.log('Getting average rating for seller:', sellerId);
    
    // Get all products from this seller and calculate average of their ratings
    const result = await this.ratingsRepository
      .createQueryBuilder('rating')
      .leftJoin('rating.product', 'product')
      .leftJoin('product.seller', 'seller')
      .select('AVG(rating.rating)', 'average')
      .where('seller.id = :sellerId', { sellerId })
      .getRawOne();

    const average = result?.average ? parseFloat(result.average) : 0;
    console.log('Average rating result:', average);
    return average;
  }

  async getSellerRatingCount(sellerId: number): Promise<number> {
    console.log('Getting rating count for seller:', sellerId);
    
    // Count all ratings for products from this seller
    const count = await this.ratingsRepository
      .createQueryBuilder('rating')
      .leftJoin('rating.product', 'product')
      .leftJoin('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId })
      .getCount();
    
    console.log('Rating count result:', count);
    return count;
  }

  async hasUserRatedSeller(userId: number, sellerId: number): Promise<boolean> {
    console.log('Checking if user has rated seller:', { userId, sellerId });
    
    const count = await this.ratingsRepository.count({
      where: { 
        user: { id: userId }, 
        seller: { id: sellerId },
        type: 'seller'
      }
    });
    
    const hasRated = count > 0;
    console.log('User has rated seller:', hasRated);
    return hasRated;
  }

  async hasUserRatedProduct(userId: number, productId: number): Promise<boolean> {
    console.log('Checking if user has rated product:', { userId, productId });
    
    const count = await this.ratingsRepository.count({
      where: { 
        user: { id: userId }, 
        product: { id: productId },
        type: 'product'
      }
    });
    
    const hasRated = count > 0;
    console.log('User has rated product:', hasRated);
    return hasRated;
  }

  async update(id: number, updateRatingDto: Partial<CreateRatingDto>): Promise<Rating | null> {
    try {
      // First, check if the rating exists
      const existingRating = await this.findOne(id);
      if (!existingRating) {
        return null;
      }

      // Update only the provided fields
      const updateData: any = {};
      
      if (updateRatingDto.rating !== undefined) {
        updateData.rating = updateRatingDto.rating;
      }
      
      if (updateRatingDto.comment !== undefined) {
        updateData.comment = updateRatingDto.comment;
      }
      
      if (updateRatingDto.type !== undefined) {
        updateData.type = updateRatingDto.type;
      }

      // Don't update userId, productId, or sellerId
      // These should remain the same

      await this.ratingsRepository.update(id, updateData);
      
      // Return the updated rating with relations
      return await this.findOne(id);
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.ratingsRepository.delete(id);
  }
}
