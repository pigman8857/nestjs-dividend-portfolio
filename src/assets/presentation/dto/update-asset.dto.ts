import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AssetType, DividendFrequency } from '../../domain/asset.entity';

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  ticker?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['ETF', 'FUND'])
  @IsOptional()
  type?: AssetType;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  expenseRatio?: number;

  @IsEnum(['monthly', 'quarterly', 'annual'])
  @IsOptional()
  dividendFrequency?: DividendFrequency;

  @IsInt()
  @Min(0)
  @IsOptional()
  currentPriceCents?: number;
}
