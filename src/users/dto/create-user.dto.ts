import { IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from 'src/common/dtos/location.dto';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class CreateUserDto {
  @IsString()
  telegramId: string;

  @IsString()
  @Matches(/^\+998\s?(9[0-9]|3[3]|7[1]|8[8]|6[1])[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, {
    message: 'Phone number must be a valid Uzbekistan number (e.g., +998 90 123 45 67)',
  })
  phoneNumber: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsString()
  paymentMethod: PaymentMethod;

  @IsString()
  language: 'uz' | 'ru';
}
