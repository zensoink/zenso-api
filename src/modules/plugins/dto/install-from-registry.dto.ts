import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InstallFromRegistryDTO {
  @IsString()
  @IsNotEmpty()
  pluginId!: string;

  @IsOptional()
  @IsString()
  version?: string;
}
