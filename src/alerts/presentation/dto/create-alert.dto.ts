import { IsEnum, IsInt, IsMongoId, Min } from 'class-validator';
import { AlertCondition } from '../../domain/alert.entity';

export class CreateAlertDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  assetId: string;

  @IsEnum(['above', 'below'])
  condition: AlertCondition;

  @IsInt()
  @Min(1)
  targetPriceCents: number;
}
