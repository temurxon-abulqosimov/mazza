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
    const seller = this.sellersRepository.create({
      ...createSellerDto,
      location: createSellerDto.location,
    });
    return this.sellersRepository.save(seller);
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
    const sellers = await this.sellersRepository
      .createQueryBuilder('seller')
      .leftJoinAndSelect('seller.products', 'products')
      .where('seller.status = :status', { status: SellerStatus.APPROVED })
      .andWhere('products.isActive = :isActive', { isActive: true })
      .andWhere('products.availableUntil > :now', { now: new Date() })
      .getMany();

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const sellersWithDistance = sellers.map(seller => {
      const distance = calculateDistance(
        userLat,
        userLon,
        seller.location.latitude,
        seller.location.longitude,
      );

      const isOpen = currentTime >= seller.opensAt && currentTime <= seller.closesAt;

      return {
        ...seller,
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