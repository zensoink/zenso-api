import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceClaimStatus } from '@prisma/client';

export class DeviceResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  uid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty()
  palette!: string[];

  @ApiProperty()
  deviceTokenVersion!: number;

  @ApiPropertyOptional()
  lastSeenAt?: Date | null;

  @ApiPropertyOptional()
  firmwareVersion?: string | null;

  @ApiPropertyOptional()
  revokedAt?: Date | null;

  @ApiProperty()
  userId!: number | null;

  @ApiProperty({ enum: DeviceClaimStatus })
  claimStatus!: DeviceClaimStatus;

  @ApiPropertyOptional()
  claimedAt?: Date | null;

  @ApiPropertyOptional()
  lastBootstrapAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
