import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class BootstrapRequestDto {
  @IsString()
  @IsNotEmpty()
  hardware_id!: string;

  @IsOptional()
  @IsString()
  firmware_version?: string;

  @IsOptional()
  @IsObject()
  hardware_info?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  display_info?: Record<string, unknown>;
}
