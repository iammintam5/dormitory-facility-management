import { MaintenanceResultStatus, MaintenanceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMaintenanceRecordFromItemDto {
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
}
