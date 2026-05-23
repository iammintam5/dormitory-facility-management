import { IsOptional, IsString } from 'class-validator';

export class CompleteInventoryCheckDto {
  @IsOptional()
  @IsString()
  generalNote?: string;
}
