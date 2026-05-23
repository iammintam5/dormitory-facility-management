import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDormBuildingDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
