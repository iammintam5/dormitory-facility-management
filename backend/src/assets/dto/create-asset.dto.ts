import { IsString, IsOptional, IsEnum, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum AssetStatusEnum {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  DAMAGED = 'DAMAGED',
  PENDING_LIQUIDATION = 'PENDING_LIQUIDATION',
  LIQUIDATED = 'LIQUIDATED',
}

export class CreateAssetDto {
  @IsString()
  assetCode!: string;

  @IsString()
  assetName!: string;

  @IsInt()
  @Type(() => Number)
  categoryId!: number;



  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  purchaseCost?: number;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsOptional()
  @IsString()
  assetName?: string;



  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;


}
