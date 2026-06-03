import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateScreenSlotDTO {
  @IsInt()
  @IsNotEmpty()
  pluginInstanceId!: number;

  @IsString()
  @IsNotEmpty()
  slotKey!: string;

  @IsOptional()
  @IsInt()
  renderOrder?: number;

  @IsOptional()
  @IsInt()
  x?: number;

  @IsOptional()
  @IsInt()
  y?: number;

  @IsOptional()
  @IsInt()
  w?: number;

  @IsOptional()
  @IsInt()
  h?: number;

  @IsOptional()
  @IsInt()
  zIndex?: number;
}
