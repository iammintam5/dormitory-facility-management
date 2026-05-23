import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class HandoverItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  conditionAtHandover!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
