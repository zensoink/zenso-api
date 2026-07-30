import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class BootstrapRequestDto {
  @ApiProperty({ description: 'Unique hardware identifier', example: 'e4:5f:01:23:45:67' })
  @IsString()
  @IsNotEmpty()
  hardware_id!: string;

  @ApiPropertyOptional({ description: 'Firmware version string', example: '1.2.3' })
  @IsOptional()
  @IsString()
  firmware_version?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary hardware metadata (model, revision, etc.)',
    example: { model: 'ESP32', revision: '2.1' },
  })
  @IsOptional()
  @IsObject()
  hardware_info?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Display panel capabilities (resolution, type)',
    example: { type: 'epd_7in5', resolution: '800x480' },
  })
  @IsOptional()
  @IsObject()
  display_info?: Record<string, unknown>;
}
