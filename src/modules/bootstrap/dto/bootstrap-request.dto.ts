import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class BootstrapRequestDto {
  @ApiProperty({
    description: 'Canonical hardware identifier (12 uppercase hex chars, MAC without separators)',
    example: 'E45F01234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-F]{12}$/, {
    message: 'hardware_id must be the canonical 12-char uppercase MAC without separators (e.g. E45F01234567)',
  })
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
