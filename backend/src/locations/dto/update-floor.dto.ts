import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFloorDto {
  @IsOptional()
  @IsInt()
  buildingId?: number;

  @IsOptional()
  @IsInt()
  floorNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;
}
