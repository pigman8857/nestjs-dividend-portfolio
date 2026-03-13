import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { AlertCondition } from '../../domain/alert.entity';

export class UpdateAlertDto {
  @IsEnum(['above', 'below'])
  @IsOptional()
  condition?: AlertCondition;

  @IsInt()
  @Min(1)
  @IsOptional()
  targetPriceCents?: number;
}
