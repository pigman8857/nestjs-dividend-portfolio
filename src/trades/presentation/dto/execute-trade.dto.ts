import { IsInt, IsMongoId, IsPositive, Min } from 'class-validator';

export class ExecuteTradeDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  assetId: string;

  @IsPositive()
  shares: number;

  @IsInt()
  @Min(1)
  pricePerShareCents: number;
}
