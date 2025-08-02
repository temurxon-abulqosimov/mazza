import { IsString, IsUUID, IsInt } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  userId: number;

  @IsInt()
  sellerId: number;

  @IsInt()
  productId: number;

  @IsString()
  code: string; // Randomly generated booking code
}
