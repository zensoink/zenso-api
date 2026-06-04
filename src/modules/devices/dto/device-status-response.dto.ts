import { ApiProperty } from '@nestjs/swagger';

export class DeviceStatusResponseDto {
  @ApiProperty()
  uid!: string;

  @ApiProperty()
  screenId!: number | null;

  @ApiProperty()
  imageUrl!: string | null;

  @ApiProperty()
  refreshRate!: number;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty()
  palette!: string[];

  @ApiProperty()
  renderMode!: string;

  @ApiProperty()
  hasImage!: boolean;

  @ApiProperty()
  contentChanged!: boolean;
}
