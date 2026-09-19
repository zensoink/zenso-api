export const ditherImage = jest.fn();
export const replaceColors = jest.fn();

export const aitjcizeSpectra6Palette = [
  { name: 'black', color: '#020202', deviceColor: '#000000' },
  { name: 'white', color: '#BEC8C8', deviceColor: '#FFFFFF' },
  { name: 'blue', color: '#05409E', deviceColor: '#0000FF' },
  { name: 'green', color: '#27663C', deviceColor: '#00FF00' },
  { name: 'red', color: '#871300', deviceColor: '#FF0000' },
  { name: 'yellow', color: '#CDCA00', deviceColor: '#FFFF00' },
];

export const acepPalette = [
  { name: 'black', color: '#191E21', deviceColor: '#000' },
  { name: 'white', color: '#F1F1F1', deviceColor: '#fff' },
  { name: 'blue', color: '#31318F', deviceColor: '#0000FF' },
  { name: 'green', color: '#53A428', deviceColor: '#00FF00' },
  { name: 'red', color: '#D20E13', deviceColor: '#FF0000' },
  { name: 'orange', color: '#B85E1C', deviceColor: '#FF8000' },
  { name: 'yellow', color: '#F3CF11', deviceColor: '#FFFF00' },
];

export const PROCESSING_PRESETS = {
  balanced: {},
  dynamic: {},
  vivid: {},
  soft: {},
  grayscale: {},
};

export const getDefaultPalettes = jest.fn(() => [
  '#191E21',
  '#F1F1F1',
  '#31318F',
  '#53A428',
  '#D20E13',
  '#B85E1C',
  '#F3CF11',
]);

export default {
  ditherImage,
  replaceColors,
  aitjcizeSpectra6Palette,
  acepPalette,
  PROCESSING_PRESETS,
  getDefaultPalettes,
};
