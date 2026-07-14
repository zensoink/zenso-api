import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScreenSlotResponseDto {
  @ApiProperty({ description: 'Unique slot ID', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Parent screen ID', example: 1 })
  screenId!: number;

  @ApiProperty({ description: 'Assigned plugin instance ID', example: 1 })
  pluginInstanceId!: number;

  @ApiProperty({ description: 'Unique key within screen', example: 'main' })
  slotKey!: string;

  @ApiProperty({ description: 'X offset in pixels', example: 0 })
  x!: number;

  @ApiProperty({ description: 'Y offset in pixels', example: 0 })
  y!: number;

  @ApiProperty({ description: 'Slot width in pixels', example: 400 })
  w!: number;

  @ApiProperty({ description: 'Slot height in pixels', example: 480 })
  h!: number;

  @ApiProperty({ description: 'Z-index (higher = on top)', example: 0 })
  zIndex!: number;

  @ApiProperty({ description: 'Render order (lower = behind)', example: 0 })
  renderOrder!: number;

  @ApiPropertyOptional({ description: 'Resolved plugin instance object' })
  pluginInstance?: Record<string, unknown>;
}
