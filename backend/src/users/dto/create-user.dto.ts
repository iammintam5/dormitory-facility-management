import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  roleId!: string;

  @IsString()
  fullName!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  studentCode?: string;

  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  course?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  studentCode?: string | null;

  @IsOptional()
  @IsString()
  faculty?: string | null;

  @IsOptional()
  @IsString()
  course?: string | null;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
