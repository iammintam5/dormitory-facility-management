import { IsString, IsOptional, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReclaimReceiptDto {
  @IsInt()
  @Type(() => Number)
  fromRoomId!: number;

  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  assetIds!: number[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  receiptDate?: string;
}
