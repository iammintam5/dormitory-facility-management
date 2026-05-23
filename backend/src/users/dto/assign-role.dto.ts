import { IsInt } from 'class-validator';

export class AssignRoleDto {
  @IsInt()
  roleId!: number;
}
