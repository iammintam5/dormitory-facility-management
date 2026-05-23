import { IsString } from 'class-validator';

export class CreateDamageReportFromMaintenanceDto {
  @IsString()
  description!: string;

}
