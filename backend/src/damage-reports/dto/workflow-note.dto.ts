import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WorkflowNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
