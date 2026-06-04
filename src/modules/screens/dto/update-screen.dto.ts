import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateScreenDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  layoutType?: string;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  deviceId?: number | null;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  palette?: string[];

  @IsOptional()
  @IsString()
  renderMode?: string;

  @IsOptional()
  @IsInt()
  refreshRate?: number;
}
