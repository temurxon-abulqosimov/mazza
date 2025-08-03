import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller } from './entities/seller.entity';
import { CreateSellerDto } from './dto/create-seller.dto';
import { calculateDistance } from 'src/common/utils/distance.util';
import { SellerStatus } from 'src/common/enums/seller-status.enum';

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(Seller)
    private sellersRepository: Repository<Seller>,
  ) {}

  async create(createSellerDto: CreateSellerDto): Promise<Seller> {
    // Convert DTO to entity-compatible object
    const sellerData = {
      telegramId: createSellerDto.telegramId,
      phoneNumber: createSellerDto.phoneNumber,
      businessName: createSellerDto.businessName,
      businessType: createSellerDto.businessType,
      location: createSellerDto.location ? {
        latitude: createSellerDto.location.latitude,
        longitude: createSellerDto.location.longitude
      } : undefined,
      opensAt: createSellerDto.opensAt,
      closesAt: createSellerDto.closesAt,
      status: createSellerDto.status,
      language: createSellerDto.language
    };
    
    const seller = this.sellersRepository.create(sellerData);
    try {
      return await this.sellersRepository.save(seller);
    } catch (error) {
      // Check if it's a unique constraint violation
      if (error.code === '23505' && error.constraint === 'UQ_b3fd4e011b2ce0c0e33d5178f64') {
        throw new Error('Seller already exists with this telegram ID');
      }
      throw error;
    }
  }

  async findAll(): Promise<Seller[]> {
    return this.sellersRepository.find({
      relations: ['products'],
    });
  }

  async findOne(id: number): Promise<Seller | null> {
    return this.sellersRepository.findOne({
      where: { id },
      relations: ['products'],
    });
  }

  async findByTelegramId(telegramId: string): Promise<Seller | null> {
    return this.sellersRepository.findOne({
      where: { telegramId },
      relations: ['products'],
    });
  }

  async findApprovedSellers(): Promise<Seller[]> {
    return this.sellersRepository.find({
      where: { status: SellerStatus.APPROVED },
      relations: ['products'],
    });
  }

  async findNearbyStores(
    userLat: number,
    userLon: number,
    limit: number = 10,
  ): Promise<Array<Seller & { distance: number; isOpen: boolean; averageRating: number }>> {
    // First, get all approved sellers
    const sellers = await this.sellersRepository
      .createQueryBuilder('seller')
      .leftJoinAndSelect('seller.products', 'products')
      .where('seller.status = :status', { status: SellerStatus.APPROVED })
      .getMany();

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const sellersWithDistance = sellers
      .filter(seller => seller.location !== null && seller.location !== undefined) // Filter out sellers without location
      .map(seller => {
        const distance = calculateDistance(
          userLat,
          userLon,
          seller.location!.latitude,
          seller.location!.longitude,
        );

        const isOpen = currentTime >= seller.opensAt && currentTime <= seller.closesAt;

        // Filter active products for this seller
        const activeProducts = seller.products.filter(product => 
          product.isActive && new Date(product.availableUntil) > now
        );

        return {
          ...seller,
          products: activeProducts, // Only include active products
          distance,
          isOpen,
          averageRating: 0, // Will be calculated separately
        };
      });

    // Sort by distance and return top results
    return sellersWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  async update(id: number, updateSellerDto: Partial<CreateSellerDto>): Promise<Seller | null> {
    const updateData: any = { ...updateSellerDto };
    if (updateSellerDto.location) {
      updateData.location = updateSellerDto.location;
    }
    await this.sellersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: SellerStatus): Promise<Seller | null> {
    await this.sellersRepository.update(id, { status });
    return this.findOne(id);
  }

  async updateLanguage(telegramId: string, language: 'uz' | 'ru'): Promise<Seller | null> {
    await this.sellersRepository.update({ telegramId }, { language });
    return this.findByTelegramId(telegramId);
  }

  async remove(id: number): Promise<void> {
    await this.sellersRepository.delete(id);
  }
}