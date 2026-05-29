import { IsOptional, IsString } from 'class-validator';

export class LiquidationWorkflowNoteDto {
  @IsOptional()
  @IsString()
  note?: string;
}
