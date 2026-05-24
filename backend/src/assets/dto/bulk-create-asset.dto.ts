import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class BulkCreateAssetDto {
  @IsInt()
  categoryId!: number;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsString()
  @IsNotEmpty()
  prefix!: string;

  @IsString()
  @IsNotEmpty()
  assetName!: string;

  @IsInt()
  @Min(1)
  startNumber!: number;

  @IsInt()
  @Min(1)
  endNumber!: number;

  @IsOptional()
  @IsInt()
  yearInUse?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
