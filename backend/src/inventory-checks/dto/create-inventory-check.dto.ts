import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateInventoryCheckDto {
  @IsInt()
  roomId!: number;

  @IsDateString()
  checkDate!: string;

  @IsOptional()
  @IsString()
  generalNote?: string;
}
