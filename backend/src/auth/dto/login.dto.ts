import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  userCode!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
