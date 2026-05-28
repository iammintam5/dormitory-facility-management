import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class CouncilMemberDto {
  @IsInt()
  @IsNotEmpty()
  userId!: number;

  @IsString()
  @IsNotEmpty()
  roleInCouncil!: string;
}

export class UpdateCouncilDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouncilMemberDto)
  members!: CouncilMemberDto[];
}
