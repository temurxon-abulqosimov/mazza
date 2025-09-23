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
  Req,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { SellersService } from '../../sellers/sellers.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { SellerAuthGuard } from '../guard/seller.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { AdminOrSellerGuard } from '../guard/adminOrSeller.guard';
import { CreateProductDto } from '../../products/dto/create-product.dto';
import { UpdateProductDto } from '../../products/dto/update-product.dto';

@Controller('webapp/products')
export class WebappProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly sellersService: SellersService,
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
      
      return await this.productsService.findAll();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch nearby products', HttpStatus.INTERNAL_SERVER_ERROR);
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
      
      return product;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Seller-only endpoints
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
  async create(@Req() req, @Body() createProductDto: CreateProductDto) {
    try {
      const telegramId = req.user.telegramId;
      
      const seller = await this.sellersService.findByTelegramId(telegramId);
      if (!seller) {
        throw new HttpException('Seller not found. Please register as a seller first.', HttpStatus.NOT_FOUND);
      }
      
      createProductDto.sellerId = seller.id;
      
      return await this.productsService.create(createProductDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to create product', HttpStatus.INTERNAL_SERVER_ERROR);
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
