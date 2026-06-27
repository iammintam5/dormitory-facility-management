import { IsString, IsOptional, IsInt, Min, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBuildingDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  genderZone?: string | null;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  floors?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  defaultCapacity?: number;

  @IsOptional()
  @IsString()
  defaultRoomType?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultAreaM2?: number | null;

  @IsOptional()
  @IsString()
  defaultCondition?: string | null;

  @IsOptional()
  @IsString()
  defaultNote?: string | null;
}

export class UpdateBuildingDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  genderZone?: string | null;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class BatchUpdateRoomsDto {
  @IsInt({ each: true })
  @Type(() => Number)
  roomIds!: number[];

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
  note?: string | null;
}
