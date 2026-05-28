import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CouncilMemberDto } from './update-council.dto';

export class CreateLiquidationRecordDto {
  @IsInt()
  @IsPositive()
  assetId!: number;

  @IsDateString()
  liquidationDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  assetCondition!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedRemainingValue?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouncilMemberDto)
  members?: CouncilMemberDto[];
}
