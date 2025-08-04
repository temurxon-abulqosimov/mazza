import { IsString, IsNumber, IsEnum, ValidateNested, IsOptional, Length, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LocationDto } from 'src/common/dtos/location.dto';
import { BusinessType } from 'src/common/enums/business-type.enum';
import { SellerStatus } from 'src/common/enums/seller-status.enum';

export class CreateSellerDto {
  @IsString()
  @Length(1, 50)
  @Transform(({ value }) => String(value).trim())
  telegramId: string;

  @IsString()
  @Length(10, 20)
  @Transform(({ value }) => String(value).trim())
  phoneNumber: string;

  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => String(value).trim())
  businessName: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsNumber()
  @Min(0)
  @Max(1440) // 24 hours in minutes
  opensAt: number;

  @IsNumber()
  @Min(0)
  @Max(1440) // 24 hours in minutes
  closesAt: number;

  @IsString()
  @IsEnum(['uz', 'ru'])
  language: 'uz' | 'ru';

  @IsOptional()
  @IsEnum(SellerStatus)
  status?: SellerStatus;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  imageUrl?: string;
}
