import { IsString, IsOptional, IsInt, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLiquidationRecordDto {
  @IsInt()
  @Type(() => Number)
  assetId!: number;

  @IsDateString()
  liquidationDate!: string;

  @IsString()
  assetCondition!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedRemainingValue?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateLiquidationRecordDto {
  @IsOptional()
  @IsDateString()
  liquidationDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
