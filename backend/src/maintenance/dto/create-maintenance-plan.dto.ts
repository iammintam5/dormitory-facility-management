import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenancePlanDto {
  @IsInt()
  assetId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cycleMonths!: number;

  @IsDateString()
  nextDueDate!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
