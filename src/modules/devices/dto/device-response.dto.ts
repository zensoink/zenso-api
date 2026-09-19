import { VALID_DISPLAY_PROFILE_IDS, VALID_PRESET_IDS } from '@modules/render';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceClaimStatus, DeviceStatus } from '@prisma/client';

export class DeviceResponseDto {
  @ApiProperty({ description: 'Unique device ID', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Unique hardware identifier', example: 'e4:5f:01:23:45:67' })
  hardwareId!: string;

  @ApiProperty({ description: 'Human-readable device name', example: 'Living Room Display' })
  name!: string;

  @ApiProperty({ description: 'Current device status', enum: DeviceStatus, example: 'active' })
  status!: DeviceStatus;

  @ApiProperty({ description: 'Display width in pixels', example: 800 })
  width!: number;

  @ApiProperty({ description: 'Display height in pixels', example: 480 })
  height!: number;

  @ApiProperty({
    description: 'Color palette hex strings',
    example: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00'],
  })
  palette!: string[];

  @ApiProperty({
    description: 'Display profile identifier',
    enum: VALID_DISPLAY_PROFILE_IDS,
    example: 'spectra6_7in3',
  })
  displayProfile!: string;

  @ApiPropertyOptional({
    description: 'EPD dithering and tone mapping configuration',
    example: { colorMatching: 'lab', ditheringType: 'errorDiffusion' },
    nullable: true,
  })
  epdConfig?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Sleep cadence / polling interval in seconds', example: 300 })
  refreshRate!: number;

  @ApiProperty({ description: 'Display orientation in degrees', enum: [0, 90, 180, 270], example: 0 })
  rotation!: number;

  @ApiProperty({
    description: 'Active palette preset name',
    enum: VALID_PRESET_IDS,
    example: 'full',
  })
  palettePreset!: string;

  @ApiProperty({ description: 'Current JWT token version (incremented on secret rotation)', example: 1 })
  deviceTokenVersion!: number;

  @ApiPropertyOptional({ description: 'Last check-in timestamp (ISO 8601)', example: '2026-07-14T10:30:00.000Z' })
  lastSeenAt?: Date | null;

  @ApiPropertyOptional({ description: 'Installed firmware version', example: '1.2.3' })
  firmwareVersion?: string | null;

  @ApiPropertyOptional({ description: 'Soft-delete timestamp (null if active)', example: null, nullable: true })
  revokedAt?: Date | null;

  @ApiProperty({ description: 'Owning user ID', example: 1 })
  userId!: number;

  @ApiProperty({ description: 'Device claim status', enum: DeviceClaimStatus, example: 'claimed' })
  claimStatus!: DeviceClaimStatus;

  @ApiPropertyOptional({ description: 'When the device was claimed', example: '2026-07-14T10:00:00.000Z' })
  claimedAt?: Date | null;

  @ApiPropertyOptional({ description: 'When the device last bootstrapped', example: '2026-07-14T10:00:00.000Z' })
  lastBootstrapAt?: Date | null;

  @ApiProperty({ description: 'Record creation timestamp', example: '2026-07-14T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Record last update timestamp', example: '2026-07-14T10:30:00.000Z' })
  updatedAt!: Date;
}
