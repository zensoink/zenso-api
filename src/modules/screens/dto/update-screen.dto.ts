export class UpdateScreenDTO {
  name?: string;
  layoutType?: string;
  width?: number;
  height?: number;
  deviceId?: number | null;
  isActive?: boolean;
  palette?: string[];
  renderMode?: string;
  refreshRate?: number;
}
