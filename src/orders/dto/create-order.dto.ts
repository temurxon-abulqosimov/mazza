import { IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { OrderStatus } from 'src/common/enums/order-status.enum';

export class CreateOrderDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
} 