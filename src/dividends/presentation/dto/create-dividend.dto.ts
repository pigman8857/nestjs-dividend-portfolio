import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsObject, IsString, Min, ValidateNested } from 'class-validator';
import { DividendFrequency } from '../../domain/dividend.entity';

class DividendMetadataDto {
  @IsString()
  ticker: string;

  @IsString()
  assetId: string;
}

export class CreateDividendDto {
  @IsDate()
  @Type(() => Date)
  exDate: Date;

  @IsObject()
  @ValidateNested()
  @Type(() => DividendMetadataDto)
  metadata: DividendMetadataDto;

  @IsInt()
  @Min(0)
  amountPerShareCents: number;

  @IsDate()
  @Type(() => Date)
  paymentDate: Date;

  @IsEnum(['monthly', 'quarterly', 'annual'])
  frequency: DividendFrequency;
}
