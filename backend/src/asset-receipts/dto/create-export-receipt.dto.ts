import { IsString, IsOptional, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportItemDto {
  @IsInt()
  @Type(() => Number)
  id!: number;

  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsOptional()
  @IsString()
  assetName?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  qty?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateExportReceiptDto {
  @IsOptional()
  @IsString()
  exportDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  generalNote?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExportItemDto)
  items!: ExportItemDto[];
}
