import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateScreenSlotDTO {
  @ApiProperty({ description: 'Plugin instance ID to assign', example: 1 })
  @IsInt()
  @IsNotEmpty()
  pluginInstanceId!: number;

  @ApiProperty({ description: 'Unique slot key within the screen', example: 'main' })
  @IsString()
  @IsNotEmpty()
  slotKey!: string;

  @ApiPropertyOptional({ description: 'Render order (lower = rendered first/behind)', example: 0 })
  @IsOptional()
  @IsInt()
  renderOrder?: number;

  @ApiPropertyOptional({ description: 'X offset in pixels', example: 0 })
  @IsOptional()
  @IsInt()
  x?: number;

  @ApiPropertyOptional({ description: 'Y offset in pixels', example: 0 })
  @IsOptional()
  @IsInt()
  y?: number;

  @ApiPropertyOptional({ description: 'Slot width in pixels', example: 400 })
  @IsOptional()
  @IsInt()
  w?: number;

  @ApiPropertyOptional({ description: 'Slot height in pixels', example: 200 })
  @IsOptional()
  @IsInt()
  h?: number;

  @ApiPropertyOptional({ description: 'Z-index (higher = on top)', example: 0 })
  @IsOptional()
  @IsInt()
  zIndex?: number;
}
