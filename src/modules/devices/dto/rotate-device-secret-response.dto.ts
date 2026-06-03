import { ApiProperty } from '@nestjs/swagger';

export class RotateDeviceSecretResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  rawSecret!: string;
}
