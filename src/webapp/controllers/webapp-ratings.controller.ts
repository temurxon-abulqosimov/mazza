import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  UseGuards, 
  Req, 
  Param, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { RatingsService } from '../../ratings/ratings.service';
import { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from '../guard/auth.guard';
import { UserAuthGuard } from '../guard/user.guard';
import { AdminAuthGuard } from '../guard/admin.guard';
import { AdminOrUserGuard } from '../guard/userOrAdmin.guard';
import { CreateRatingDto } from '../../ratings/dto/create-rating.dto';
import { UpdateRatingDto } from '../../ratings/dto/update-rating.dto';

@Controller('webapp/ratings')
export class WebappRatingsController {
  constructor(
    private readonly ratingsService: RatingsService,
    private readonly usersService: UsersService,
  ) {}

  // Admin-only endpoints
  @Get()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findAll() {
    try {
      return await this.ratingsService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch ratings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('admin/user/:userId')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async findByUser(@Param('userId') userId: string) {
    try {
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
      }
      return await this.ratingsService.findByUser(userIdNum);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch user ratings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Public endpoints
  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    try {
      const productIdNum = parseInt(productId, 10);
      if (isNaN(productIdNum)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }
      return await this.ratingsService.findByProduct(productIdNum);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch product ratings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('product/:productId/average')
  async getAverageRatingByProduct(@Param('productId') productId: string) {
    try {
      const productIdNum = parseInt(productId, 10);
      if (isNaN(productIdNum)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }
      const average = await this.ratingsService.getAverageRatingByProduct(productIdNum);
      return { productId: productIdNum, averageRating: average };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch product average rating', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('seller/:sellerId')
  async findBySeller(@Param('sellerId') sellerId: string) {
    try {
      const sellerIdNum = parseInt(sellerId, 10);
      if (isNaN(sellerIdNum)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      return await this.ratingsService.findBySeller(sellerIdNum);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller ratings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('seller/:sellerId/average')
  async getAverageRatingBySeller(@Param('sellerId') sellerId: string) {
    try {
      const sellerIdNum = parseInt(sellerId, 10);
      if (isNaN(sellerIdNum)) {
        throw new HttpException('Invalid seller ID', HttpStatus.BAD_REQUEST);
      }
      const average = await this.ratingsService.getAverageRatingBySeller(sellerIdNum);
      return { sellerId: sellerIdNum, averageRating: average };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch seller average rating', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // User-only endpoints
  @Get('my')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async findMyRatings(@Req() req) {
    try {
      const telegramId = req.user.telegramId;
      const user = await this.usersService.findByTelegramId(telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.ratingsService.findByUser(user.id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch your ratings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminOrUserGuard)
  async findOne(@Param('id') id: string) {
    try {
      const ratingId = parseInt(id, 10);
      if (isNaN(ratingId)) {
        throw new HttpException('Invalid rating ID', HttpStatus.BAD_REQUEST);
      }
      
      const rating = await this.ratingsService.findOne(ratingId);
      if (!rating) {
        throw new HttpException('Rating not found', HttpStatus.NOT_FOUND);
      }
      
      return rating;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch rating', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async create(@Req() req, @Body() createRatingDto: CreateRatingDto) {
    try {
      const telegramId = req.user.telegramId;
      const user = await this.usersService.findByTelegramId(telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      createRatingDto.userId = user.id;
      
      if (!createRatingDto.productId && !createRatingDto.sellerId) {
        throw new HttpException('Either productId or sellerId is required', HttpStatus.BAD_REQUEST);
      }
      
      if (createRatingDto.productId && createRatingDto.sellerId) {
        throw new HttpException('Cannot rate both product and seller in the same rating', HttpStatus.BAD_REQUEST);
      }
      
      return await this.ratingsService.create(createRatingDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to create rating', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async update(@Param('id') id: string, @Req() req, @Body() updateRatingDto: UpdateRatingDto) {
    try {
      const ratingId = parseInt(id, 10);
      if (isNaN(ratingId)) {
        throw new HttpException('Invalid rating ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingRating = await this.ratingsService.findOne(ratingId);
      if (!existingRating) {
        throw new HttpException('Rating not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      const user = await this.usersService.findByTelegramId(telegramId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      if (existingRating.user.id !== user.id) {
        throw new HttpException('You can only update your own ratings', HttpStatus.FORBIDDEN);
      }
      
      return await this.ratingsService.update(ratingId, updateRatingDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update rating', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminOrUserGuard)
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const ratingId = parseInt(id, 10);
      if (isNaN(ratingId)) {
        throw new HttpException('Invalid rating ID', HttpStatus.BAD_REQUEST);
      }
      
      const existingRating = await this.ratingsService.findOne(ratingId);
      if (!existingRating) {
        throw new HttpException('Rating not found', HttpStatus.NOT_FOUND);
      }
      
      const telegramId = req.user.telegramId;
      
      // Admin can delete any rating
      if (req.user.role === 'ADMIN') {
        await this.ratingsService.remove(ratingId);
        return { message: 'Rating deleted successfully' };
      }
      
      // User can only delete their own ratings
      if (req.user.role === 'USER') {
        const user = await this.usersService.findByTelegramId(telegramId);
        if (!user) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }
        
        if (existingRating.user.id !== user.id) {
          throw new HttpException('You can only delete your own ratings', HttpStatus.FORBIDDEN);
        }
      }
      
      await this.ratingsService.remove(ratingId);
      return { message: 'Rating deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete rating', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
