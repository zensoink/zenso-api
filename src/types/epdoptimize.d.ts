declare module 'epdoptimize' {
  export enum Dither {
    None = 0,
    FloydSteinberg = 1,
    Stucki = 2,
    Atkinson = 3,
    Burkes = 4,
    Sierra = 5,
    TwoRowSierra = 6,
    SierraLite = 7,
    JarvisJudiceNinke = 8,
  }

  export type Palette = [number, number, number][];

  export interface DitherOptions {
    dither?: Dither | number;
    palette?: Palette;
    format?: 'png' | 'jpg' | 'bmp';
    preprocess?: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
      gamma?: number;
    };
  }

  // Definicja głównej funkcji, którą pokazały logi
  export function ditherImage(image: Buffer, options?: DitherOptions): Promise<Buffer>;

  // Obsługa eksportu domyślnego dla różnych konfiguracji środowiska
  const _default: {
    ditherImage: typeof ditherImage;
    Dither: typeof Dither;
  };
  export default _default;
}
