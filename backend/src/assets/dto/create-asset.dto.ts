import { AssetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAssetDto {
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  assetCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  assetName!: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  yearInUse?: number | null;

  @IsOptional()
  @IsString()
  description?: string;
}
