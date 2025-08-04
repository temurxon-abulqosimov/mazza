import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller } from './entities/seller.entity';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { calculateDistance, calculateDistanceFromLocations, calculateDistanceSimple, formatDistance } from 'src/common/utils/distance.util';
import { SellerStatus } from 'src/common/enums/seller-status.enum';

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(Seller)
    private sellersRepository: Repository<Seller>,
  ) {}

  async create(createSellerDto: CreateSellerDto): Promise<Seller> {
    // Convert DTO to entity-compatible object with proper location handling
    const sellerData = {
      telegramId: createSellerDto.telegramId,
      phoneNumber: createSellerDto.phoneNumber,
      businessName: createSellerDto.businessName,
      businessType: createSellerDto.businessType,
      location: createSellerDto.location && 
                typeof createSellerDto.location.latitude === 'number' && 
                typeof createSellerDto.location.longitude === 'number' ? {
        latitude: createSellerDto.location.latitude,
        longitude: createSellerDto.location.longitude
      } : null,
      opensAt: createSellerDto.opensAt,
      closesAt: createSellerDto.closesAt,
      status: createSellerDto.status,
      language: createSellerDto.language,
      imageUrl: createSellerDto.imageUrl
    };
    
    console.log('Creating seller with data:', {
      ...sellerData,
      location: sellerData.location ? `${sellerData.location.latitude}, ${sellerData.location.longitude}` : 'null'
    });
    
    const seller = this.sellersRepository.create(sellerData);
    try {
      const savedSeller = await this.sellersRepository.save(seller);
      console.log('Saved seller location:', savedSeller.location);
      return savedSeller;
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
    limit: number = 50,
  ): Promise<Array<Seller & { distance: number | null; isOpen: boolean; averageRating: number }>> {
    // Get all approved sellers with their products
    const sellers = await this.sellersRepository
      .createQueryBuilder('seller')
      .leftJoinAndSelect('seller.products', 'products')
      .where('seller.status = :status', { status: SellerStatus.APPROVED })
      .getMany();

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const sellersWithDistance = sellers
      .map(seller => {
        // Calculate distance if seller has location
        let distance: number | null = null;
        
        console.log(`Processing seller: ${seller.businessName}`, {
          sellerId: seller.id,
          hasLocation: !!seller.location,
          locationType: typeof seller.location,
          locationValue: seller.location,
          locationRaw: JSON.stringify(seller.location),
          userLat,
          userLon
        });
        
        // Robust location data extraction
        let sellerLat: number | null = null;
        let sellerLon: number | null = null;
        
        if (seller.location && 
            typeof seller.location === 'object' && 
            seller.location !== null &&
            typeof seller.location.latitude === 'number' && 
            typeof seller.location.longitude === 'number' &&
            !isNaN(seller.location.latitude) && 
            !isNaN(seller.location.longitude)) {
          
          sellerLat = seller.location.latitude;
          sellerLon = seller.location.longitude;
          console.log(`Location data extracted successfully for ${seller.businessName}: ${sellerLat}, ${sellerLon}`);
        } else {
          console.log(`Invalid or missing location data for ${seller.businessName}:`, seller.location);
        }
        
        if (sellerLat !== null && sellerLon !== null) {
          try {
            // Use only the accurate Haversine formula
            distance = calculateDistance(userLat, userLon, sellerLat, sellerLon);
            
            console.log(`Distance calculation for ${seller.businessName}:`, {
              userLocation: { latitude: userLat, longitude: userLon },
              sellerLocation: { latitude: sellerLat, longitude: sellerLon },
              calculatedDistance: distance
            });
          } catch (error) {
            console.error(`Distance calculation error for ${seller.businessName}:`, error);
            distance = null;
          }
        } else {
          console.log(`No valid location for seller: ${seller.businessName} (ID: ${seller.id})`);
          console.log('Seller location data:', seller.location);
        }

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
      })
      .filter(seller => seller.products.length > 0); // Only include sellers with available products

    // Sort by distance (ascending) - sellers with distance first, then those without
    return sellersWithDistance
      .sort((a, b) => {
        // If both have distance, sort by distance
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        // If only a has distance, a comes first
        if (a.distance !== null && b.distance === null) {
          return -1;
        }
        // If only b has distance, b comes first
        if (a.distance === null && b.distance !== null) {
          return 1;
        }
        // If neither has distance, maintain original order
        return 0;
      })
      .slice(0, limit);
  }

  async update(id: number, updateSellerDto: Partial<CreateSellerDto>): Promise<Seller | null> {
    const updateData: any = { ...updateSellerDto };
    
    // Handle location update with proper validation
    if (updateSellerDto.location) {
      if (typeof updateSellerDto.location.latitude === 'number' && 
          typeof updateSellerDto.location.longitude === 'number' &&
          !isNaN(updateSellerDto.location.latitude) && 
          !isNaN(updateSellerDto.location.longitude)) {
        updateData.location = {
          latitude: updateSellerDto.location.latitude,
          longitude: updateSellerDto.location.longitude
        };
      } else {
        updateData.location = null;
      }
    }
    
    await this.sellersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: SellerStatus): Promise<Seller | null> {
    await this.sellersRepository.update(id, { status });
    return this.findOne(id);
  }

  async updateLanguage(telegramId: string, language: 'uz' | 'ru'): Promise<Seller | null> {
    const seller = await this.findByTelegramId(telegramId);
    if (!seller) return null;
    
    return this.update(seller.id, { language });
  }
}