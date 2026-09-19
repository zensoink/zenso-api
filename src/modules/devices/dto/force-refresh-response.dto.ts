import { ApiProperty } from '@nestjs/swagger';

export class ForceRefreshResponseDto {
  @ApiProperty({ description: 'ID of the device whose screens were refreshed', example: 1 })
  deviceId!: number;

  @ApiProperty({ description: 'Number of linked screens whose render cache was invalidated', example: 1 })
  invalidatedScreensCount!: number;

  @ApiProperty({ description: 'Timestamp when the force-refresh was triggered', example: '2026-09-19T10:00:00.000Z' })
  refreshedAt!: Date;
}
