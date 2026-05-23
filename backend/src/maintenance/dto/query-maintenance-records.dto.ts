import { MaintenanceResultStatus, MaintenanceType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMaintenanceRecordsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assetId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planId?: number;

  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenanceType?: MaintenanceType;

  @IsOptional()
  @IsEnum(MaintenanceResultStatus)
  resultStatus?: MaintenanceResultStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}
