import { IsString, Matches, ValidateNested, IsOptional, Length, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LocationDto } from 'src/common/dtos/location.dto';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class CreateUserDto {
  @IsString()
  @Length(1, 50)
  @Transform(({ value }) => String(value).trim())
  telegramId: string;

  @IsString()
  @Length(10, 20)
  @Matches(/^\+998\s?(9[0-9]|3[3]|7[1]|8[8]|6[1])[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, {
    message: 'Phone number must be a valid Uzbekistan number (e.g., +998 90 123 45 67)',
  })
  @Transform(({ value }) => String(value).trim())
  phoneNumber: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsEnum(['uz', 'ru'])
  language: 'uz' | 'ru';
}
