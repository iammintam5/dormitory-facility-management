import { IsString, IsOptional, IsInt, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryCheckDto {
  @IsInt()
  @Type(() => Number)
  roomId!: number;

  @IsDateString()
  checkDate!: string;

  @IsOptional()
  @IsString()
  generalNote?: string;
}

export class UpdateInventoryCheckDto {
  @IsOptional()
  @IsDateString()
  checkDate?: string;

  @IsOptional()
  @IsString()
  generalNote?: string;
}

export class InventoryCheckItemDto {
  @IsInt()
  @Type(() => Number)
  itemId!: number;

  @IsInt()
  @Type(() => Number)
  actualQuantity!: number;

  @IsOptional()
  @IsString()
  actualCondition?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SaveInventoryItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCheckItemDto)
  items!: InventoryCheckItemDto[];
}

export class CompleteInventoryCheckDto {
  @IsOptional()
  @IsString()
  generalNote?: string;
}
