import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Req, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { SellersService } from '../../sellers/sellers.service';
import { OrdersService } from '../../orders/orders.service';
import { RatingsService } from '../../ratings/ratings.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { UserAuthGuard } from '../guard/user.guard';
import { calculateDistance } from '../../common/utils/distance.util';

@Controller('webapp/discovery')
export class WebappProductDiscoveryController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly sellersService: SellersService,
    private readonly ordersService: OrdersService,
    private readonly ratingsService: RatingsService,
  ) {}

  // Browse products with filters
  @Get('products')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async browseProducts(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string = '5',
    @Query('category') category: string,
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string,
    @Query('businessType') businessType: string,
    @Query('sortBy') sortBy: string = 'distance',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    try {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new HttpException('Invalid coordinates', HttpStatus.BAD_REQUEST);
      }

      // Get all active products
      const products = await this.productsService.findActiveProducts();
      
      // Filter and calculate distances
      const productsWithInfo = await Promise.all(
        products.map(async (product) => {
          const seller = await this.sellersService.findOne(product.seller.id);
          if (!seller || !seller.location) return null;
          
          const distance = calculateDistance(
            latitude,
            longitude,
            seller.location.latitude,
            seller.location.longitude
          );
          
          // Filter by radius
          if (distance > radiusKm) return null;
          
          // Filter by business type if specified
          if (businessType && seller.businessType !== businessType) return null;
          
          // Filter by price range
          if (minPrice && product.price < parseFloat(minPrice)) return null;
          if (maxPrice && product.price > parseFloat(maxPrice)) return null;
          
          // Filter by category
          if (category && product.category !== category) return null;
          
          // Get product ratings
          const ratings = await this.ratingsService.findByProduct(product.id);
          const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
            : 0;

          return {
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            description: product.description,
            imageUrl: product.imageUrl,
            category: product.category,
            isActive: product.isActive,
            quantity: product.quantity,
            availableUntil: product.availableUntil,
            createdAt: product.createdAt,
            store: {
              id: seller.id,
              businessName: seller.businessName,
              businessType: seller.businessType,
              distance: Math.round(distance * 100) / 100,
              location: seller.location
            },
            stats: {
              averageRating: Math.round(averageRating * 10) / 10,
              totalRatings: ratings.length
            }
          };
        })
      );

      // Remove null values
      const validProducts = productsWithInfo.filter(p => p !== null);
      
      // Sort products
      switch (sortBy) {
        case 'distance':
          validProducts.sort((a, b) => a.store.distance - b.store.distance);
          break;
        case 'price':
          validProducts.sort((a, b) => a.price - b.price);
          break;
        case 'rating':
          validProducts.sort((a, b) => b.stats.averageRating - a.stats.averageRating);
          break;
        case 'newest':
          validProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        default:
          validProducts.sort((a, b) => a.store.distance - b.store.distance);
      }

      // Pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedProducts = validProducts.slice(startIndex, endIndex);

      return {
        products: paginatedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: validProducts.length,
          totalPages: Math.ceil(validProducts.length / limitNum)
        },
        filters: {
          latitude,
          longitude,
          radius: radiusKm,
          category,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
          businessType,
          sortBy
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to browse products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get product details
  @Get('products/:id')
  async getProductDetails(@Param('id') id: string) {
    try {
      const productId = parseInt(id, 10);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }

      const product = await this.productsService.findOne(productId);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      // Get seller info
      const seller = await this.sellersService.findOne(product.seller.id);
      if (!seller) {
        throw new HttpException('Store not found', HttpStatus.NOT_FOUND);
      }

      // Get product ratings
      const ratings = await this.ratingsService.findByProduct(productId);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0;

      return {
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          description: product.description,
          imageUrl: product.imageUrl,
          category: product.category,
          isActive: product.isActive,
          quantity: product.quantity,
          availableUntil: product.availableUntil,
          createdAt: product.createdAt
        },
        store: {
          id: seller.id,
          businessName: seller.businessName,
          businessType: seller.businessType,
          location: seller.location,
          opensAt: seller.opensAt,
          closesAt: seller.closesAt,
          language: seller.language,
          imageUrl: seller.imageUrl
        },
        ratings: {
          average: Math.round(averageRating * 10) / 10,
          total: ratings.length,
          reviews: ratings.slice(0, 10)
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get product details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 