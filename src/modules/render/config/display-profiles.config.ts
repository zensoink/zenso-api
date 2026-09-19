export const VALID_DISPLAY_PROFILE_IDS = [
  'spectra6_7in3',
  'acep_7in3',
  'acep_5in65',
  'bwr_4in2',
  'mono_800x480',
  'custom',
] as const;

export type ValidDisplayProfileId = (typeof VALID_DISPLAY_PROFILE_IDS)[number];

export const VALID_PRESET_IDS = ['full', '3color', 'mono', 'custom'] as const;

export type ValidPresetId = (typeof VALID_PRESET_IDS)[number];

export interface DisplayPigment {
  name: string;
  hex: string;
  calibratedHex: string;
  nibble: number;
}

export interface DisplayPreset {
  id: ValidPresetId;
  name: string;
  description: string;
  palette: string[];
}

export interface DisplayProfile {
  id: ValidDisplayProfileId;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  isCustom: boolean;
  bpp: number;
  hardwareNibbleMap: Record<string, number>;
  physicalPigments: DisplayPigment[];
  presets: DisplayPreset[];
  defaultEpdConfig: Record<string, unknown>;
  nibbleHeaderString: string;
}

export const DEFAULT_EPD_CONFIG: Record<string, unknown> = {
  processingPreset: 'vivid',
  colorMatching: 'lab',
  ditheringType: 'errorDiffusion',
  errorDiffusionMatrix: 'floydSteinberg',
  serpentine: true,
};

export function buildHardwareNibbleMap(pigments: readonly DisplayPigment[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const pigment of pigments) {
    map[pigment.name] = pigment.nibble;
  }
  return map;
}

export function buildNibbleHeaderString(pigments: readonly DisplayPigment[]): string {
  return pigments.map(p => `${p.nibble}:${p.name}`).join(', ');
}

interface ProfileDefinition {
  id: ValidDisplayProfileId;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  isCustom?: boolean;
  bpp?: number;
  physicalPigments: DisplayPigment[];
  presets: DisplayPreset[];
  defaultEpdConfig?: Record<string, unknown>;
  hardwareNibbleMap?: Record<string, number>;
  nibbleHeaderString?: string;
}

function createProfile(def: ProfileDefinition): DisplayProfile {
  return {
    id: def.id,
    name: def.name,
    defaultWidth: def.defaultWidth,
    defaultHeight: def.defaultHeight,
    isCustom: def.isCustom ?? false,
    bpp: def.bpp ?? 4,
    hardwareNibbleMap: def.hardwareNibbleMap ?? buildHardwareNibbleMap(def.physicalPigments),
    physicalPigments: def.physicalPigments,
    presets: def.presets,
    defaultEpdConfig: def.defaultEpdConfig ?? DEFAULT_EPD_CONFIG,
    nibbleHeaderString: def.nibbleHeaderString ?? buildNibbleHeaderString(def.physicalPigments),
  };
}

export const DISPLAY_PROFILES: DisplayProfile[] = [
  createProfile({
    id: 'spectra6_7in3',
    name: 'Seeed 7.3" Spectra™ 6 (800 × 480, 6 Colors)',
    defaultWidth: 800,
    defaultHeight: 480,
    physicalPigments: [
      { name: 'black', hex: '#000000', calibratedHex: '#020202', nibble: 0 },
      { name: 'white', hex: '#FFFFFF', calibratedHex: '#BEC8C8', nibble: 1 },
      { name: 'green', hex: '#00FF00', calibratedHex: '#27663C', nibble: 2 },
      { name: 'blue', hex: '#0000FF', calibratedHex: '#05409E', nibble: 3 },
      { name: 'red', hex: '#FF0000', calibratedHex: '#871300', nibble: 4 },
      { name: 'yellow', hex: '#FFFF00', calibratedHex: '#CDCA00', nibble: 5 },
    ],
    presets: [
      {
        id: 'full',
        name: '6-color Full Spectrum',
        description: 'All 6 physical pigment colors: Black, White, Green, Blue, Red, Yellow',
        palette: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00'],
      },
      {
        id: '3color',
        name: '3-color Contrast',
        description: 'High contrast Black, White, and Red highlights',
        palette: ['#000000', '#FFFFFF', '#FF0000'],
      },
      {
        id: 'mono',
        name: 'Monochrome',
        description: 'Crisp black and white with no color dithering',
        palette: ['#000000', '#FFFFFF'],
      },
    ],
  }),
  createProfile({
    id: 'acep_7in3',
    name: '7.3" ACeP 7-Color (800 × 480, 7 Colors)',
    defaultWidth: 800,
    defaultHeight: 480,
    physicalPigments: [
      { name: 'black', hex: '#000000', calibratedHex: '#191E21', nibble: 0 },
      { name: 'white', hex: '#FFFFFF', calibratedHex: '#F1F1F1', nibble: 1 },
      { name: 'green', hex: '#00FF00', calibratedHex: '#53A428', nibble: 2 },
      { name: 'blue', hex: '#0000FF', calibratedHex: '#31318F', nibble: 3 },
      { name: 'red', hex: '#FF0000', calibratedHex: '#D20E13', nibble: 4 },
      { name: 'yellow', hex: '#FFFF00', calibratedHex: '#F3CF11', nibble: 5 },
      { name: 'orange', hex: '#FF8000', calibratedHex: '#B85E1C', nibble: 6 },
    ],
    presets: [
      {
        id: 'full',
        name: '7-color Full Spectrum',
        description: 'Full ACeP palette including Orange pigment',
        palette: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00', '#FF8000'],
      },
      {
        id: '3color',
        name: '3-color Contrast',
        description: 'High contrast Black, White, and Red',
        palette: ['#000000', '#FFFFFF', '#FF0000'],
      },
      {
        id: 'mono',
        name: 'Monochrome',
        description: 'Crisp black and white',
        palette: ['#000000', '#FFFFFF'],
      },
    ],
  }),
  createProfile({
    id: 'acep_5in65',
    name: '5.65" ACeP 7-Color (600 × 448, 7 Colors)',
    defaultWidth: 600,
    defaultHeight: 448,
    physicalPigments: [
      { name: 'black', hex: '#000000', calibratedHex: '#191E21', nibble: 0 },
      { name: 'white', hex: '#FFFFFF', calibratedHex: '#F1F1F1', nibble: 1 },
      { name: 'green', hex: '#00FF00', calibratedHex: '#53A428', nibble: 2 },
      { name: 'blue', hex: '#0000FF', calibratedHex: '#31318F', nibble: 3 },
      { name: 'red', hex: '#FF0000', calibratedHex: '#D20E13', nibble: 4 },
      { name: 'yellow', hex: '#FFFF00', calibratedHex: '#F3CF11', nibble: 5 },
      { name: 'orange', hex: '#FF8000', calibratedHex: '#B85E1C', nibble: 6 },
    ],
    presets: [
      {
        id: 'full',
        name: '7-color Full Spectrum',
        description: 'Full ACeP palette for 5.65" displays',
        palette: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00', '#FF8000'],
      },
      {
        id: '3color',
        name: '3-color Contrast',
        description: 'Black, White, and Red contrast',
        palette: ['#000000', '#FFFFFF', '#FF0000'],
      },
      {
        id: 'mono',
        name: 'Monochrome',
        description: 'Black and white',
        palette: ['#000000', '#FFFFFF'],
      },
    ],
  }),
  createProfile({
    id: 'bwr_4in2',
    name: '4.2" 3-Color BWR (400 × 300, 3 Colors)',
    defaultWidth: 400,
    defaultHeight: 300,
    physicalPigments: [
      { name: 'black', hex: '#000000', calibratedHex: '#000000', nibble: 0 },
      { name: 'white', hex: '#FFFFFF', calibratedHex: '#FFFFFF', nibble: 1 },
      { name: 'red', hex: '#FF0000', calibratedHex: '#FF0000', nibble: 4 },
    ],
    presets: [
      {
        id: 'full',
        name: '3-color Contrast (Black, White, Red)',
        description: 'Physical 3-color panel palette with Red highlights',
        palette: ['#000000', '#FFFFFF', '#FF0000'],
      },
      {
        id: 'mono',
        name: 'Monochrome',
        description: 'Black and white only',
        palette: ['#000000', '#FFFFFF'],
      },
    ],
  }),
  createProfile({
    id: 'mono_800x480',
    name: 'Monochrome E-Ink (800 × 480, 2 Colors)',
    defaultWidth: 800,
    defaultHeight: 480,
    physicalPigments: [
      { name: 'black', hex: '#000000', calibratedHex: '#000000', nibble: 0 },
      { name: 'white', hex: '#FFFFFF', calibratedHex: '#FFFFFF', nibble: 1 },
    ],
    presets: [
      {
        id: 'mono',
        name: 'Monochrome',
        description: 'High contrast 1-bit Black and White',
        palette: ['#000000', '#FFFFFF'],
      },
    ],
  }),
  createProfile({
    id: 'custom',
    name: 'Custom Resolution Display',
    defaultWidth: 800,
    defaultHeight: 480,
    isCustom: true,
    physicalPigments: [
      { name: 'black', hex: '#000000', calibratedHex: '#000000', nibble: 0 },
      { name: 'white', hex: '#FFFFFF', calibratedHex: '#FFFFFF', nibble: 1 },
      { name: 'green', hex: '#00FF00', calibratedHex: '#00FF00', nibble: 2 },
      { name: 'blue', hex: '#0000FF', calibratedHex: '#0000FF', nibble: 3 },
      { name: 'red', hex: '#FF0000', calibratedHex: '#FF0000', nibble: 4 },
      { name: 'yellow', hex: '#FFFF00', calibratedHex: '#FFFF00', nibble: 5 },
      { name: 'orange', hex: '#FFA500', calibratedHex: '#FFA500', nibble: 6 },
    ],
    presets: [
      {
        id: 'full',
        name: '7-color Spectrum',
        description: 'Full 7-color palette for custom panels',
        palette: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00', '#FFA500'],
      },
      {
        id: '3color',
        name: '3-color Contrast',
        description: 'Black, White, and Red contrast',
        palette: ['#000000', '#FFFFFF', '#FF0000'],
      },
      {
        id: 'mono',
        name: 'Monochrome',
        description: 'Black and white',
        palette: ['#000000', '#FFFFFF'],
      },
      {
        id: 'custom',
        name: 'Custom Palette',
        description: 'User-specified color palette (up to 7 colors)',
        palette: ['#000000', '#FFFFFF', '#FF0000'],
      },
    ],
  }),
];

const PROFILE_MAP = new Map<string, DisplayProfile>(DISPLAY_PROFILES.map(profile => [profile.id, profile]));

export function getAllDisplayProfiles(): DisplayProfile[] {
  return DISPLAY_PROFILES;
}

export function getDisplayProfile(profileId?: string | null): DisplayProfile {
  if (profileId) {
    const found = PROFILE_MAP.get(profileId);
    if (found) {
      return found;
    }
  }
  return DISPLAY_PROFILES[0];
}
