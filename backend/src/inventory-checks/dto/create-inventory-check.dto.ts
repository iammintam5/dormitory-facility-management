import { IsDateString, IsInt, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CouncilMemberDto } from './update-council.dto';

export class CreateInventoryCheckDto {
  @IsInt()
  roomId!: number;

  @IsDateString()
  checkDate!: string;

  @IsOptional()
  @IsString()
  generalNote?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouncilMemberDto)
  members?: CouncilMemberDto[];
}
