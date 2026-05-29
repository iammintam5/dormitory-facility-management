import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateDamageReportDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;
}
