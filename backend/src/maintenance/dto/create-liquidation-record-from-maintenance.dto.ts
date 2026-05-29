import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLiquidationRecordFromMaintenanceDto {
  @IsDateString()
  liquidationDate!: string;

  @IsString()
  assetCondition!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedRemainingValue?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
