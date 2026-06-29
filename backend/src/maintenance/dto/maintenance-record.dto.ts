import { IsString, IsOptional, IsInt, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceType as PrismaMaintenanceType, MaintenanceResultStatus, MaintenanceReturnMode } from '@prisma/client';

export class CreateMaintenanceRecordDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  planId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  damageReportId?: number;



  @IsInt()
  @Type(() => Number)
  assetId!: number;

  @IsDateString()
  maintenanceDate!: string;

  @IsEnum(PrismaMaintenanceType)
  maintenanceType!: PrismaMaintenanceType;

  @IsString()
  content!: string;

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

export class CompleteMaintenanceRecordDto {
  @IsEnum(MaintenanceResultStatus)
  resultStatus!: MaintenanceResultStatus;

  @IsOptional()
  @IsEnum(MaintenanceReturnMode)
  returnMode?: MaintenanceReturnMode;

  @IsOptional()
  @IsString()
  content?: string;

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

export class CreateDirectCompletedRecordDto {
  @IsInt()
  @Type(() => Number)
  damageReportId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  performedBy?: number;

  @IsOptional()
  @IsDateString()
  maintenanceDate?: string;

  @IsString()
  content!: string;

  @IsEnum(MaintenanceResultStatus)
  resultStatus!: MaintenanceResultStatus;

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
