import { IsNumber, IsOptional, IsString, Max, Min, IsEnum } from 'class-validator';

export class CreateRatingDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsNumber()
  userId?: number; // Make this optional since it's set by controller

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  sellerId?: number;

  @IsOptional()
  @IsEnum(['product', 'seller'])
  type?: 'product' | 'seller' = 'product';
} 