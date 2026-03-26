declare module 'epdoptimize' {
  export type DitheringType = 'errorDiffusion' | 'ordered' | 'random' | 'quantizationOnly';

  export type ErrorDiffusionMatrix =
    | 'floydSteinberg'
    | 'falseFloydSteinberg'
    | 'jarvis'
    | 'stucki'
    | 'burkes'
    | 'sierra3'
    | 'sierra2'
    | 'sierra2-4a';

  export type OrderedDitheringType = 'bayer';
  export type RandomDitheringType = 'blackAndWhite' | 'rgb';
  export type PredefinedPalette = 'default' | 'spectra6' | 'acep';

  export interface DitherOptions {
    ditheringType?: DitheringType;
    errorDiffusionMatrix?: ErrorDiffusionMatrix;
    serpentine?: boolean;
    orderedDitheringType?: OrderedDitheringType;
    orderedDitheringMatrix?: [number, number];
    randomDitheringType?: RandomDitheringType;
    palette?: PredefinedPalette | string[];
    sampleColorsFromImage?: boolean;
    numberOfSampleColors?: number;
  }

  export function ditherImage(
    inputCanvas: import('canvas').Canvas,
    outputCanvas: import('canvas').Canvas,
    options?: DitherOptions
  ): unknown;

  export function getDefaultPalettes(type?: PredefinedPalette): string[];

  export function getDeviceColors(type?: PredefinedPalette): string[];

  export function replaceColors(
    inputCanvas: import('canvas').Canvas,
    outputCanvas: import('canvas').Canvas,
    options: {
      originalColors: string[];
      replaceColors: string[];
    }
  ): unknown;
}
