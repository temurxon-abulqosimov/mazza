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
    console.log('=== FIND NEARBY STORES START ===');
    console.log('User location:', { latitude: userLat, longitude: userLon });
    
    // Get all approved sellers with their products
    const sellers = await this.sellersRepository
      .createQueryBuilder('seller')
      .leftJoinAndSelect('seller.products', 'products')
      .where('seller.status = :status', { status: SellerStatus.APPROVED })
      .getMany();

    console.log(`Found ${sellers.length} approved sellers`);

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const sellersWithDistance = sellers
      .map(seller => {
        console.log(`\nProcessing seller: ${seller.businessName} (ID: ${seller.id})`);
        console.log(`Total products for this seller: ${seller.products.length}`);
        
        // Calculate distance if seller has location
        let distance: number | null = null;
        
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
          console.log(`Location data extracted: ${sellerLat}, ${sellerLon}`);
        } else {
          console.log(`Invalid or missing location data:`, seller.location);
        }
        
        if (sellerLat !== null && sellerLon !== null) {
          try {
            distance = calculateDistance(userLat, userLon, sellerLat, sellerLon);
            console.log(`Distance calculated: ${distance} km`);
          } catch (error) {
            console.error(`Distance calculation error:`, error);
            distance = null;
          }
        } else {
          console.log(`No valid location for seller`);
        }

        const isOpen = currentTime >= seller.opensAt && currentTime <= seller.closesAt;
        console.log(`Store hours: ${seller.opensAt} - ${seller.closesAt}, Current time: ${currentTime}, Is open: ${isOpen}`);

        // Filter active products for this seller
        const activeProducts = seller.products.filter(product => {
          const isActive = product.isActive;
          const isAvailable = new Date(product.availableUntil) > now;
          
          console.log(`Product ${product.id}: isActive=${isActive}, availableUntil=${product.availableUntil}, isAvailable=${isAvailable}`);
          
          return isActive && isAvailable;
        });

        console.log(`Active products for ${seller.businessName}: ${activeProducts.length}`);

        return {
          ...seller,
          products: activeProducts, // Only include active products
          distance,
          isOpen,
          averageRating: 0, // Will be calculated separately
        };
      })
      .filter(seller => {
        const hasProducts = seller.products.length > 0;
        console.log(`Seller ${seller.businessName}: has products = ${hasProducts}`);
        return hasProducts;
      }); // Only include sellers with available products

    console.log(`\nSellers with active products: ${sellersWithDistance.length}`);

    // Sort by distance (ascending) - sellers with distance first, then those without
    const sortedSellers = sellersWithDistance
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

    console.log(`\nFinal result: ${sortedSellers.length} stores`);
    sortedSellers.forEach((seller, index) => {
      console.log(`Store ${index + 1}: ${seller.businessName} - ${seller.products.length} products - Distance: ${seller.distance} km`);
    });

    console.log('=== FIND NEARBY STORES END ===');
    return sortedSellers;
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