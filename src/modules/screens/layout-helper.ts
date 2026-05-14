export interface SlotDefinition {
  slotKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayoutType = 'full' | 'split-50-50' | 'top-bottom' | '2x2';

export function getLayoutSlots(layoutType: LayoutType, width: number, height: number): SlotDefinition[] {
  switch (layoutType) {
    case 'full':
      return [{ slotKey: 'A', x: 0, y: 0, w: width, h: height }];

    case 'split-50-50':
      return [
        { slotKey: 'A', x: 0, y: 0, w: Math.floor(width / 2), h: height },
        { slotKey: 'B', x: Math.floor(width / 2), y: 0, w: Math.ceil(width / 2), h: height },
      ];

    case 'top-bottom':
      return [
        { slotKey: 'A', x: 0, y: 0, w: width, h: Math.floor(height / 2) },
        { slotKey: 'B', x: 0, y: Math.floor(height / 2), w: width, h: Math.ceil(height / 2) },
      ];

    case '2x2': {
      const hw = Math.floor(width / 2);
      const hh = Math.floor(height / 2);
      return [
        { slotKey: 'A', x: 0, y: 0, w: hw, h: hh },
        { slotKey: 'B', x: hw, y: 0, w: Math.ceil(width / 2), h: hh },
        { slotKey: 'C', x: 0, y: hh, w: hw, h: Math.ceil(height / 2) },
        { slotKey: 'D', x: hw, y: hh, w: Math.ceil(width / 2), h: Math.ceil(height / 2) },
      ];
    }

    default:
      return [];
  }
}
