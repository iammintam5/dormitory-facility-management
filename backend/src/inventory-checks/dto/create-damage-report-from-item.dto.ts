import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateDamageReportFromItemDto {
  @IsString()
  description!: string;

}
