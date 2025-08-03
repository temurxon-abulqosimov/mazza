import { Transform, Type } from 'class-transformer';
import { IsNumber, IsString, Matches, ValidateNested, IsOptional } from 'class-validator';
import { LocationDto } from 'src/common/dtos/location.dto';
import { BusinessType } from 'src/common/enums/business-type.enum';
import { SellerStatus } from 'src/common/enums/seller-status.enum';

export class CreateSellerDto {
  @IsString()
  telegramId: string;

  @IsString()
  @Matches(/^\+998\s?(9[0-9]|3[3]|7[1]|8[8]|6[1])[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, {
    message: 'Phone number must be a valid Uzbekistan number (e.g., +998 90 123 45 67)',
  })
  phoneNumber: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsString()
  businessType: BusinessType;

  @IsString()
  @Matches(/^[a-zA-Z0-9\s]+$/, {
    message: 'Business name must contain only alphanumeric characters and spaces',
  })
  businessName: string;

  @Transform(({ value }) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  })
  @IsNumber()
  opensAt: number;

  @Transform(({ value }) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  })
  @IsNumber()
  closesAt: number;

  @IsString()
  status: SellerStatus = SellerStatus.PENDING;

  @IsString()
  language: 'uz' | 'ru';
}
