import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateScreenDTO {
  @ApiProperty({ description: 'Screen name', example: 'Kitchen Dashboard' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Layout template key', example: 'grid' })
  @IsOptional()
  @IsString()
  layoutType?: string;

  @ApiPropertyOptional({ description: 'Canvas width in pixels', example: 800 })
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional({ description: 'Canvas height in pixels', example: 480 })
  @IsOptional()
  @IsInt()
  height?: number;

  @ApiPropertyOptional({ description: 'Assigned device ID (null = unassigned)', example: 1 })
  @IsOptional()
  @IsInt()
  deviceId?: number;

  @ApiPropertyOptional({ description: 'Whether the screen is active (renders on device)', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'IANA timezone for rendering (falls back to user, then server default)',
    example: 'Europe/Warsaw',
  })
  @IsOptional()
  @IsString()
  timeZoneIana?: string;
}
