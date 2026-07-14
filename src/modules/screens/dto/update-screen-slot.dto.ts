import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateScreenSlotDTO {
  @ApiPropertyOptional({ description: 'Render order (lower = rendered first/behind)', example: 1 })
  @IsOptional()
  @IsInt()
  renderOrder?: number;

  @ApiPropertyOptional({ description: 'X offset in pixels', example: 10 })
  @IsOptional()
  @IsInt()
  x?: number;

  @ApiPropertyOptional({ description: 'Y offset in pixels', example: 10 })
  @IsOptional()
  @IsInt()
  y?: number;

  @ApiPropertyOptional({ description: 'Slot width in pixels', example: 300 })
  @IsOptional()
  @IsInt()
  w?: number;

  @ApiPropertyOptional({ description: 'Slot height in pixels', example: 150 })
  @IsOptional()
  @IsInt()
  h?: number;

  @ApiPropertyOptional({ description: 'Z-index (higher = on top)', example: 1 })
  @IsOptional()
  @IsInt()
  zIndex?: number;
}
