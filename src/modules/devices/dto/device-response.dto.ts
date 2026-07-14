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

  @ApiProperty({ description: 'Color palette hex strings', example: ['#000000', '#FFFFFF'] })
  palette!: string[];

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
