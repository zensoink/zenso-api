export class CreateScreenDTO {
  name!: string;
  userId!: number;
  layoutType?: string;
  width?: number;
  height?: number;
  deviceId?: number;
  isActive?: boolean;
}
