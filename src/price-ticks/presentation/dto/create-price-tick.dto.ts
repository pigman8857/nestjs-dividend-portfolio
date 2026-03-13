import { Type } from 'class-transformer';
import { IsDate, IsInt, IsObject, IsString, Min, ValidateNested } from 'class-validator';

class PriceTickMetadataDto {
  @IsString()
  ticker: string;

  @IsString()
  assetId: string;
}

export class CreatePriceTickDto {
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @IsObject()
  @ValidateNested()
  @Type(() => PriceTickMetadataDto)
  metadata: PriceTickMetadataDto;

  @IsInt()
  @Min(0)
  openCents: number;

  @IsInt()
  @Min(0)
  highCents: number;

  @IsInt()
  @Min(0)
  lowCents: number;

  @IsInt()
  @Min(0)
  closeCents: number;

  @IsInt()
  @Min(0)
  volume: number;
}
