export interface SlotRenderInput {
  pluginInstanceId: number;
  pluginVersion?: string | null;
  configJson?: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
}
