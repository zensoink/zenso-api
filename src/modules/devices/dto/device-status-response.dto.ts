export class DeviceStatusResponseDto {
  uid!: string;
  screenId!: number | null;
  imageUrl!: string | null;
  refreshRate!: number;
  width!: number;
  height!: number;
  palette!: string[];
  renderMode!: string;
  hasImage!: boolean;
  contentChanged!: boolean;
}
