import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDormBuildingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
