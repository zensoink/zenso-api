import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  userId!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
