// src/sellers/sellers.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller } from './entities/seller.entity';
import { Product } from 'src/products/entities/product.entity';
import { BusinessType } from 'src/common/enums/business-type.enum';

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(Seller)
    private sellersRepository: Repository<Seller>,
  ) {}

  async createSeller(data: {
    telegramId: string;
    fullName: string;
    phone: string;
    businessType: BusinessType;
    latitude: number;
    longitude: number;
  }): Promise<Seller> {
    const seller = this.sellersRepository.create({
      ...data,
      location: {
        type: 'Point',
        coordinates: [data.longitude, data.latitude],
      },
    });
    return this.sellersRepository.save(seller);
  }

  async findByTelegramId(telegramId: string): Promise<Seller | null> {
    return this.sellersRepository.findOne({ where: { telegramId } });
  }

  async findNearby(latitude: number, longitude: number): Promise<Seller[]> {
    try {
      const sellers = await this.sellersRepository
        .createQueryBuilder('seller')
        .where(
          `ST_DWithin(
            seller.location,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
            5000
          )`
        )
        .setParameters({ longitude, latitude })
        .getMany();
      return sellers;
    } catch (error) {
      console.warn('PostGIS not available, falling back to Haversine formula');
      const sellers = await this.sellersRepository.find();
      return sellers.filter((seller) => {
        const [lon, lat] = seller.location.coordinates;
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (latitude * Math.PI) / 180;
        const φ2 = (lat * Math.PI) / 180;
        const Δφ = ((lat - latitude) * Math.PI) / 180;
        const Δλ = ((lon - longitude) * Math.PI) / 180;
        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance <= 5000;
      });
    }
  }
}