import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ScreenSlotResponseDto } from './screen-slot-response.dto';

export class ScreenResponseDto {
  @ApiProperty({ description: 'Unique screen ID', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Screen name', example: 'Kitchen Dashboard' })
  name!: string;

  @ApiProperty({ description: 'Owning user ID', example: 1 })
  userId!: number;

  @ApiPropertyOptional({ description: 'Assigned device ID (null if unassigned)', example: 1, nullable: true })
  deviceId?: number | null;

  @ApiProperty({ description: 'Layout template key', example: 'grid' })
  layoutType!: string;

  @ApiProperty({ description: 'Canvas width in pixels', example: 800 })
  width!: number;

  @ApiProperty({ description: 'Canvas height in pixels', example: 480 })
  height!: number;

  @ApiProperty({ description: 'Whether the screen is active', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Color palette', example: ['#000000', '#FFFFFF'] })
  palette!: string[];

  @ApiProperty({ description: 'Render mode', example: 'black-white' })
  renderMode!: string;

  @ApiProperty({ description: 'Render interval in seconds', example: 300 })
  refreshRate!: number;

  @ApiPropertyOptional({ description: 'Current content hash (ETag source)', example: 'a1b2c3d4e5f6...' })
  contentHash?: string | null;

  @ApiProperty({ description: 'Creation timestamp', example: '2026-07-14T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-07-14T10:30:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: ScreenSlotResponseDto, isArray: true, description: 'Assigned screen slots' })
  slots?: ScreenSlotResponseDto[];
}
