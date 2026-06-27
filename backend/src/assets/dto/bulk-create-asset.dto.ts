import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatusEnum } from './create-asset.dto';

export class BulkCreateAssetDto {
  @IsString()
  prefix!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  startNumber!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  endNumber!: number;

  @IsString()
  assetName!: string;

  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(AssetStatusEnum)
  status?: AssetStatusEnum;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roomId?: number | null;
}
