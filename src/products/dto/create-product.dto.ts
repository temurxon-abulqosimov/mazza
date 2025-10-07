import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, Max, Length, IsDateString, IsBoolean, IsIn, IsNotEmpty } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 255) // Max 255 characters for name
  @Transform(({ value }) => String(value).trim())
  name: string;

  @IsNumber()
  @Min(0)
  @Max(1000000000) // 1 billion max price
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000000) // 1 billion max price
  originalPrice?: number;

  @IsOptional()
  @IsString()
  @Length(1, 1000) // Max 1000 characters for description
  @Transform(({ value }) => String(value).trim())
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  availableFrom?: Date;

  @IsString()
  @Transform(({ value }) => new Date(value))
  availableUntil: Date;

  @IsOptional()
  @IsString()
  @Length(6, 6) // Exactly 6 characters for product code
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000) // Max 10,000 items per product
  quantity?: number;

  @IsOptional()
  @IsString()
  @IsIn(['bread_bakery', 'pastry', 'main_dishes', 'desserts', 'beverages', 'other'])
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  sellerId?: number;
}


