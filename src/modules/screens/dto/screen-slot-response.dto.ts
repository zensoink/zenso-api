import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScreenSlotResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  screenId!: number;

  @ApiProperty()
  pluginInstanceId!: number;

  @ApiProperty()
  slotKey!: string;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty()
  w!: number;

  @ApiProperty()
  h!: number;

  @ApiProperty()
  zIndex!: number;

  @ApiProperty()
  renderOrder!: number;

  @ApiPropertyOptional()
  pluginInstance?: Record<string, unknown>;
}
