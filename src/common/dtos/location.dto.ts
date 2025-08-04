import { Transform, Type } from 'class-transformer';
import { IsNumber, Min, Max } from 'class-validator';

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => Number(value))
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => Number(value))
  longitude: number;
}
