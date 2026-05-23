import { AssetStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAssetStatusDto {
  @IsEnum(AssetStatus)
  status!: AssetStatus;
}
