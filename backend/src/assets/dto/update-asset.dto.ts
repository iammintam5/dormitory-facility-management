import { AssetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateAssetDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  assetCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  assetName?: string;

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
  description?: string | null;
}
