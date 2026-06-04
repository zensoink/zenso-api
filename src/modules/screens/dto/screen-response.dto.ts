import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ScreenSlotResponseDto } from './screen-slot-response.dto';

export class ScreenResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  userId!: number;

  @ApiPropertyOptional()
  deviceId?: number | null;

  @ApiProperty()
  layoutType!: string;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  palette!: string[];

  @ApiProperty()
  renderMode!: string;

  @ApiProperty()
  refreshRate!: number;

  @ApiPropertyOptional()
  contentHash?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: ScreenSlotResponseDto, isArray: true })
  slots?: ScreenSlotResponseDto[];
}
