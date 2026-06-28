import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
}
