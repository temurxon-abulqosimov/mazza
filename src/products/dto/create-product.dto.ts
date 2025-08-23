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
  @IsString()
  @Length(5, 5) // Exactly 5 characters for time format "HH:MM"
  availableFrom?: string;

  @IsDateString()
  availableUntil: string;

  @IsOptional()
  @IsString()
  @Length(6, 6) // Exactly 6 characters for product code
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNumber()
  @Min(1)
  sellerId: number;
}
