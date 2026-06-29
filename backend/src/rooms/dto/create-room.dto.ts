import { IsString, IsOptional, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsString()
  roomCode!: string;

  @IsInt()
  @Type(() => Number)
  floorId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsString()
  roomType?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaM2?: number | null;

  @IsOptional()
  @IsString()
  condition?: string | null;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  roomCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsString()
  roomType?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaM2?: number | null;

  @IsOptional()
  @IsString()
  condition?: string | null;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignStudentDto {
  @IsInt()
  @Type(() => Number)
  studentId!: number;
}

export class TransferStudentDto {
  @IsInt()
  @Type(() => Number)
  studentId!: number;
}
