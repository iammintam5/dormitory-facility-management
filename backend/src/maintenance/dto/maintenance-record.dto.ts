import { IsString, IsOptional, IsInt, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceType as PrismaMaintenanceType, MaintenanceResultStatus } from '@prisma/client';

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

  @IsEnum(PrismaMaintenanceType)
  maintenanceType!: PrismaMaintenanceType;

  @IsString()
  content!: string;

  @IsEnum(MaintenanceResultStatus)
  resultStatus!: MaintenanceResultStatus;

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
  @IsEnum(PrismaMaintenanceType)
  maintenanceType?: PrismaMaintenanceType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MaintenanceResultStatus)
  resultStatus?: MaintenanceResultStatus;

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
