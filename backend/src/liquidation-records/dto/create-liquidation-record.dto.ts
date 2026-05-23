import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateLiquidationRecordDto {
  @IsInt()
  @IsPositive()
  assetId!: number;

  @IsDateString()
  liquidationDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  assetCondition!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedRemainingValue?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
