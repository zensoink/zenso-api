import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateScreenDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  userId!: number;

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
  deviceId?: number;

  @IsOptional()
  isActive?: boolean;
}
