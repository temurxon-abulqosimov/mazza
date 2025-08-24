import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, Max, Length, IsDateString, IsBoolean } from 'class-validator';

export class CreateProductDto {
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
  availableFrom?: Date;

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

  @IsNumber()
  @Min(1)
  sellerId: number;
}
