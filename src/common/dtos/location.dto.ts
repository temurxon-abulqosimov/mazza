import { Transform, Type } from 'class-transformer';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class LocationDto {
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : Number(num.toFixed(6));
  })
  latitude: number;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : Number(num.toFixed(6));
  })
  longitude: number;
}
