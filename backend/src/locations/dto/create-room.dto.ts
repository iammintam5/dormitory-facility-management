import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRoomDto {
  @IsInt()
  floorId!: number;

  @IsString()
  @MaxLength(50)
  roomCode!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
