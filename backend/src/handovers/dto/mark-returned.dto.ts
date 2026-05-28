import { AssetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ReturnItemDto {
  @IsInt()
  assetId!: number;

  @IsString()
  @MaxLength(255)
  conditionAtReturn!: string;

  @IsEnum(AssetStatus)
  returnStatus!: AssetStatus;
}

export class MarkReturnedDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}
