import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsInt()
  floorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  roomCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}
