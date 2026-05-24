import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class BulkActionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  assetIds!: number[];
}

export class BulkUpdateStatusDto extends BulkActionDto {
  @IsEnum(AssetStatus)
  status!: AssetStatus;
}

export class BulkUpdateRoomDto extends BulkActionDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  roomId?: number | null;
}
