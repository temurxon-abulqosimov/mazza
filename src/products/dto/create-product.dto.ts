import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => new Date(value))
  @IsString()
  availableUntil: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsNumber()
  sellerId: number;
}
