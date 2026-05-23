import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMaintenancePlanFromItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cycleMonths!: number;

  @IsDateString()
  nextDueDate!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
