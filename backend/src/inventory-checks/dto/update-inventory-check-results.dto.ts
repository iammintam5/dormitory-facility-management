import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateInventoryCheckItemResultDto {
  @IsInt()
  itemId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualQuantity!: number;

  @IsOptional()
  @IsString()
  actualCondition?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateInventoryCheckResultsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateInventoryCheckItemResultDto)
  items!: UpdateInventoryCheckItemResultDto[];

  @IsOptional()
  @IsString()
  generalNote?: string;
}
