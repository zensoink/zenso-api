export class CreateScreenSlotDTO {
  pluginInstanceId!: number;
  slotKey!: string;
  renderOrder?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  zIndex?: number;
}
