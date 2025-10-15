import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Query, 
  Body, 
  UseGuards, 
  UsePipes,
  ValidationPipe,
  Req,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { SellersService } from '../../sellers/sellers.service';
import { UsersService } from '../../users/users.service';
import { RatingsService } from '../../ratings/ratings.service';
import { calculateDistance } from '../../common/utils/distance.util';
import { JwtAuthGuard } from '../guard/auth.guard';
import { SellerAuthGuard } from '../guard/seller.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { AdminOrSellerGuard } from '../guard/adminOrSeller.guard';
import { CreateProductDto } from '../../products/dto/create-product.dto';
import { UpdateProductDto } from '../../products/dto/update-product.dto';
import { BusinessType } from '../../common/enums/business-type.enum';
import { SellerStatus } from '../../common/enums/seller-status.enum';
import { LocalizationService } from '../../common/services/localization.service';

@Controller('webapp/products')
export class WebappProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly sellersService: SellersService,
    private readonly usersService: UsersService,
    private readonly ratingsService: RatingsService,
    private readonly localizationService: LocalizationService,
  ) {}

  // Public endpoints - no authentication required
  @Get()
  async findAll() {
    try {
      return await this.productsService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('nearby')
  async findNearby(@Query('lat') lat: string, @Query('lng') lng: string) {
    try {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new HttpException('Invalid coordinates', HttpStatus.BAD_REQUEST);
      }
      
      // Get all active products
      const products = await this.productsService.findActiveProducts();
      
      // Filter and calculate distances with ratings
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
          
          // Get product ratings
          const ratings = await this.ratingsService.findByProduct(product.id);
          const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
            : 0;

          // Compute seller average rating from all product ratings
          const sellerAverageRating = await this.ratingsService.getAverageRatingBySeller(seller.id);

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
              location: seller.location,
              averageRating: Math.round((sellerAverageRating || 0) * 10) / 10
            },
            stats: {
              averageRating: Math.round(averageRating * 10) / 10,
              totalRatings: ratings.length
            }
          };
        })
      );

      // Remove null values and sort by distance
      const validProducts = productsWithInfo.filter(p => p !== null);
      validProducts.sort((a, b) => a.store.distance - b.store.distance);
      
      return validProducts;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch nearby products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search')
  async searchProducts(@Query('q') query?: string, @Query('category') category?: string) {
    try {
      return await this.productsService.searchProducts(query, category);
    } catch (error) {
      throw new HttpException('Failed to search products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const productId = parseInt(id, 10);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }
      
      const product = await this.productsService.findOne(productId);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      // Fetch seller info
      const seller = await this.sellersService.findOne(product.seller.id);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }

      // Fetch ratings for this product and compute averages
      const productRatings = await this.ratingsService.findByProduct(productId);
      const productAverageRating = productRatings.length > 0
        ? productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
        : 0;

      // Compute seller average rating from all of their product ratings
      const sellerAverageRating = await this.ratingsService.getAverageRatingBySeller(seller.id);

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
        seller: {
          id: seller.id,
          businessName: seller.businessName,
          businessType: seller.businessType,
          location: seller.location,
          opensAt: seller.opensAt,
          closesAt: seller.closesAt,
          language: seller.language,
          imageUrl: seller.imageUrl,
          // For product details we expose seller average rating derived from product ratings
          averageRating: Math.round((sellerAverageRating || 0) * 10) / 10,
          // Distance is unknown here without user coords – default null
          distance: null,
        },
        stats: {
          averageRating: Math.round(productAverageRating * 10) / 10,
          totalRatings: productRatings.length,
        },
        reviews: productRatings.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          user: r.user ? { id: r.user.id, firstName: (r.user as any).firstName } : null,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Seller-only endpoints
  @Get('seller/my')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async findMyProducts(@Req() req) {
    try {
      console.log('🔧 JWT Token payload for products:', req.user);
      console.log('🔧 Available user properties:', Object.keys(req.user));
      console.log('🔧 telegramId from token:', req.user.telegramId);
      console.log('🔧 sub from token:', req.user.sub);
      console.log('🔧 role from token:', req.user.role);
      
      const telegramId = req.user.telegramId;
      const userRole = req.user.role;
      
      console.log('🔧 Fetching seller products for:', {
        telegramId,
        userRole,
        timestamp: new Date().toISOString()
      });
      
      const seller = await this.sellersService.findByTelegramId(telegramId);
      console.log('🔧 Seller found:', !!seller, seller ? { id: seller.id, status: seller.status } : null);
      
      if (!seller) {
        console.log('❌ Seller not found for telegramId:', telegramId);
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      
      const products = await this.productsService.findBySeller(seller.id);
      console.log('✅ Found products for seller:', {
        sellerId: seller.id,
        productCount: products.length,
        products: products.map(p => ({ id: p.id, name: p.name, isActive: p.isActive }))
      });
      
      return products;
    } catch (error) {
      console.error('❌ Error fetching seller products:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('seller/:sellerId')
  async findBySeller(@Param('sellerId') sellerId: string) {
    try {
      const sellerIdNum = parseInt(sellerId, 10);
      if (isNaN(sellerIdNum)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      return await this.productsService.findBySeller(sellerIdNum);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    forbidNonWhitelisted: false,
    validateCustomDecorators: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }))
  async create(@Req() req, @Body() createProductDto: CreateProductDto) {
    try {
      const telegramId = req.user.telegramId;
      const userRole = req.user.role;
      const language = this.localizationService.getLanguageFromRequest(req);
      
      console.log('🔧 Product creation request:', {
        telegramId,
        userRole,
        language,
        productData: createProductDto
      });
      
      console.log('🔧 availableUntil value:', createProductDto.availableUntil);
      console.log('🔧 availableUntil type:', typeof createProductDto.availableUntil);
      
      // Validate required fields
      if (!createProductDto.name || createProductDto.name.trim().length === 0) {
        throw new HttpException(
          this.localizationService.translate('product.name.required', language), 
          HttpStatus.BAD_REQUEST
        );
      }
      
      if (createProductDto.name.length > 255) {
        throw new HttpException(
          this.localizationService.translate('product.name.too.long', language), 
          HttpStatus.BAD_REQUEST
        );
      }
      
      if (!createProductDto.price || createProductDto.price <= 0) {
        throw new HttpException(
          this.localizationService.translate('product.price.required', language), 
          HttpStatus.BAD_REQUEST
        );
      } 
      
      if (createProductDto.price > 1000000000) {
        throw new HttpException(
          this.localizationService.translate('product.price.too.high', language), 
          HttpStatus.BAD_REQUEST
        );
      }
      
      // availableUntil validation is handled by DTO
      
      // Check if user has SELLER role (new system) or exists in sellers table (old system)
      let seller;
      console.log('🔧 Checking seller for telegramId:', telegramId, 'userRole:', userRole);
      
      if (userRole === 'SELLER') {
        // New system: user with SELLER role in users table
        console.log('🔧 Using new system - checking for existing seller...');
        const existingSeller = await this.sellersService.findByTelegramId(telegramId);
        console.log('🔧 Existing seller found:', !!existingSeller);
        
        if (!existingSeller) {
          console.log('🔧 No existing seller, creating new one...');
          // Get user data from users table to create seller record
          const userData = await this.usersService.findByTelegramId(telegramId);
          console.log('🔧 User data found:', !!userData);
          
          if (!userData) {
            throw new HttpException(
              this.localizationService.translate('user.not.found', language), 
              HttpStatus.NOT_FOUND
            );
          }
          
          // Create a seller record for this user
          const createSellerDto = {
            telegramId: telegramId,
            phoneNumber: userData.phoneNumber || '+998901234567',
            businessName: `Business_${telegramId}`, // Use telegramId as business name
            businessType: BusinessType.OTHER,
            language: userData.language || 'uz',
            status: SellerStatus.PENDING // Set initial status
          };
          
          console.log('🔧 Creating seller with DTO:', createSellerDto);
          seller = await this.sellersService.create(createSellerDto);
          console.log('✅ Created new seller record:', seller.id, 'Status:', seller.status);
        } else {
          seller = existingSeller;
          console.log('✅ Found existing seller:', seller.id, 'Status:', seller.status);
        }
      } else {
        // Old system: check sellers table
        console.log('🔧 Using old system - checking sellers table...');
        seller = await this.sellersService.findByTelegramId(telegramId);
        console.log('🔧 Seller found in old system:', !!seller);
        
        if (!seller) {
          throw new HttpException(
            this.localizationService.translate('seller.not.found', language), 
            HttpStatus.NOT_FOUND
          );
        }
        console.log('✅ Found seller in old system:', seller.id, 'Status:', seller.status);
      }
      
      // Temporarily allow all sellers for testing
      console.log('🔧 Checking seller status:', seller.status);
      console.log('🔧 Temporarily allowing all sellers for testing');
      console.log('✅ Proceeding with product creation');
      
      createProductDto.sellerId = seller.id;
      
      // Convert string dates to Date objects for the service
      console.log('🔧 Converting dates...');
      console.log('🔧 availableUntil before conversion:', createProductDto.availableUntil);
      console.log('🔧 availableFrom before conversion:', createProductDto.availableFrom);
      
      const productData = {
        ...createProductDto,
        availableUntil: createProductDto.availableUntil ? new Date(createProductDto.availableUntil) : undefined,
        availableFrom: createProductDto.availableFrom ? new Date(createProductDto.availableFrom) : undefined,
      };
      
      console.log('🔧 availableUntil after conversion:', productData.availableUntil);
      console.log('🔧 availableFrom after conversion:', productData.availableFrom);
      
      // Set default values for required fields
      if (productData.isActive === undefined) {
        productData.isActive = true;
      }
      if (!productData.quantity) {
        productData.quantity = 1;
      }
      
      console.log('🔧 Creating product with seller ID:', seller.id);
      console.log('🔧 Product data:', productData);
      const product = await this.productsService.create(createProductDto);
      console.log('✅ Product created successfully:', product.id);
      
      return {
        ...product,
        message: this.localizationService.translate('product.created', language)
      };
    } catch (error) {
      console.error('❌ Product creation error:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      
      if (error instanceof HttpException) {
        console.error('❌ HTTP Exception:', error.message);
        throw error;
      }
      
      const language = this.localizationService.getLanguageFromRequest(req);
      console.error('❌ Generic error, language:', language);
      
      // Provide more specific error messages
      let errorMessage = 'Product creation failed';
      if (error.message.includes('duplicate key')) {
        errorMessage = 'Product with this code already exists';
      } else if (error.message.includes('foreign key')) {
        errorMessage = 'Invalid seller ID';
      } else if (error.message.includes('not-null')) {
        errorMessage = 'Required field is missing';
      } else if (error.message.includes('invalid input')) {
        errorMessage = 'Invalid data format';
      }
      
      throw new HttpException(
        errorMessage, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, SellerAuthGuard)
  async update(@Param('id') id: string, @Req() req, @Body() updateProductDto: UpdateProductDto) {
    try {
      const productId = parseInt(id, 10);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingProduct = await this.productsService.findOne(productId);
      if (!existingProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      const seller = await this.sellersService.findByTelegramId(telegramId);
      if (!seller) {
        throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
      }
      
      if (existingProduct.seller.id !== seller.id) {
        throw new HttpException('You can only update your own products', HttpStatus.FORBIDDEN);
      }
      
      return await this.productsService.update(productId, updateProductDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminOrSellerGuard)
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const productId = parseInt(id, 10);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingProduct = await this.productsService.findOne(productId);
      if (!existingProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      
      // Check if user is admin
      if (req.user.role === 'ADMIN') {
        return await this.productsService.deactivate(productId);
      }
      
      // Check if user is seller and owns the product
      if (req.user.role === 'SELLER') {
        const seller = await this.sellersService.findByTelegramId(telegramId);
        if (!seller) {
          throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
        }
        
        if (existingProduct.seller.id !== seller.id) {
          throw new HttpException('You can only delete your own products', HttpStatus.FORBIDDEN);
        }
      }
      
      return await this.productsService.deactivate(productId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
