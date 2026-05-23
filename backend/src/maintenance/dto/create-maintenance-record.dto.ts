import { AssetStatus, MaintenanceResultStatus, MaintenanceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMaintenanceRecordDto {
  @IsOptional()
  @IsInt()
  planId?: number;

  @IsInt()
  assetId!: number;

  @IsDateString()
  maintenanceDate!: string;

  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenanceType?: MaintenanceType;

  @IsString()
  content!: string;

  @IsEnum(MaintenanceResultStatus)
  resultStatus!: MaintenanceResultStatus;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  materialNote?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  assetStatus?: AssetStatus;
}
