import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportReceiptItemDto {
  @IsString()
  assetCode!: string;

  @IsString()
  assetName!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  qty?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitPrice?: number;

  @IsOptional()
  warranty?: any;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateImportReceiptDto {
  @IsOptional()
  @IsString()
  receiptDate?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierAddress?: string;

  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsOptional()
  @IsString()
  contractDate?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportReceiptItemDto)
  items!: ImportReceiptItemDto[];
}
