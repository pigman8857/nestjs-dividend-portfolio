import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AssetType, DividendFrequency } from '../../domain/asset.entity';

export class CreateAssetDto {
  @IsString()
  ticker: string;

  @IsString()
  name: string;

  @IsEnum(['ETF', 'FUND'])
  type: AssetType;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  expenseRatio?: number;

  @IsEnum(['monthly', 'quarterly', 'annual'])
  dividendFrequency: DividendFrequency;

  @IsInt()
  @Min(0)
  @IsOptional()
  currentPriceCents?: number;
}
