import { IsString, IsOptional, IsInt, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceRecordDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  planId?: number;

  @IsInt()
  @Type(() => Number)
  assetId!: number;

  @IsDateString()
  maintenanceDate!: string;

  @IsString()
  maintenanceType!: string;

  @IsString()
  content!: string;

  @IsString()
  resultStatus!: string;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsString()
  materialNote?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMaintenanceRecordDto {
  @IsOptional()
  @IsDateString()
  maintenanceDate?: string;

  @IsOptional()
  @IsString()
  maintenanceType?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  resultStatus?: string;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsString()
  materialNote?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
