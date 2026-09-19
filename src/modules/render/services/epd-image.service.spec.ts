import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createCanvas } from 'canvas';
import { ditherImage, replaceColors } from 'epdoptimize';
import sharp from 'sharp';

import { EpdImageService } from './epd-image.service';

jest.mock('canvas');
jest.mock('epdoptimize');

describe('EpdImageService', () => {
  let service: EpdImageService;
  let mockSharpChain: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EpdImageService],
    }).compile();
    service = module.get<EpdImageService>(EpdImageService);

    mockSharpChain = {
      resize: jest.fn().mockReturnThis(),
      rotate: jest.fn().mockReturnThis(),
      modulate: jest.fn().mockReturnThis(),
      linear: jest.fn().mockReturnThis(),
      flatten: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-processed')),
    };

    (sharp as unknown as jest.Mock).mockClear();
    (sharp as unknown as jest.Mock).mockReturnValue(mockSharpChain);
    (ditherImage as jest.Mock).mockClear();
    (replaceColors as jest.Mock).mockClear();
  });

  describe('renderPreview', () => {
    it('should return PNG from previewCanvas after replaceColors', async () => {
      const mockPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({ drawImage: jest.fn() })),
        toBuffer: jest.fn(() => mockPngBuffer),
      }));

      const result = await service.renderPreview({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(result).toBe(mockPngBuffer);
      expect(result.slice(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      expect(ditherImage).toHaveBeenCalledTimes(1);
      expect(replaceColors).toHaveBeenCalledTimes(1);
    });

    it('should apply rotation when specified', async () => {
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({ drawImage: jest.fn() })),
        toBuffer: jest.fn(() => Buffer.from('rotated-png')),
      }));

      await service.renderPreview({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
        rotation: 90,
      });

      expect(mockSharpChain.rotate).toHaveBeenCalledWith(90);
    });

    it('should skip brightness/contrast preprocessing that renderForDevice applies', async () => {
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
          getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(32 * 4) })),
        })),
        toBuffer: jest.fn(() => Buffer.from('preview-png')),
      }));

      const params = {
        input: Buffer.from('fake-png'),
        width: 4,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'photo' as const,
      };

      const previewResult = await service.renderPreview(params);
      expect(mockSharpChain.modulate).not.toHaveBeenCalled();
      expect(mockSharpChain.linear).not.toHaveBeenCalled();

      jest.clearAllMocks();
      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpChain);

      const deviceResult = await service.renderForDevice(params);
      expect(mockSharpChain.modulate).toHaveBeenCalled();
      expect(mockSharpChain.linear).toHaveBeenCalled();

      expect(previewResult).not.toEqual(deviceResult);
    });

    it('should select vivid preset for ui mode and dynamic preset for photo mode', async () => {
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({ drawImage: jest.fn() })),
        toBuffer: jest.fn(() => Buffer.from('png')),
      }));

      await service.renderPreview({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(ditherImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ditheringType: 'errorDiffusion',
          processingPreset: 'vivid',
          colorMatching: 'lab',
        })
      );

      (ditherImage as jest.Mock).mockClear();

      await service.renderPreview({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'photo',
      });

      expect(ditherImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ditheringType: 'errorDiffusion',
          processingPreset: 'dynamic',
          colorMatching: 'lab',
        })
      );
    });
  });

  describe('renderForDevice', () => {
    beforeEach(() => {
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
          getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(8 * 8 * 4) })),
        })),
        toBuffer: jest.fn(() => Buffer.from('mock-image')),
      }));
    });

    it('should return a Buffer with correct RAW4 size', async () => {
      const width = 8;
      const height = 8;

      const result = await service.renderForDevice({
        input: Buffer.from('fake-png'),
        width,
        height,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(Math.ceil(width / 2) * height);
    });

    it('should pack pixels correctly: high nibble = left, low nibble = right', async () => {
      const width = 2;
      const height = 4;

      const pixelData = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        if (i % 2 === 0) {
          pixelData[offset] = 0;
          pixelData[offset + 1] = 0;
          pixelData[offset + 2] = 0;
        } else {
          pixelData[offset] = 255;
          pixelData[offset + 1] = 255;
          pixelData[offset + 2] = 255;
        }
        pixelData[offset + 3] = 255;
      }

      const mockGetImageData = jest.fn().mockReturnValue({ data: pixelData });
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: () => ({
          drawImage: jest.fn(),
          getImageData: mockGetImageData,
        }),
        toBuffer: jest.fn(() => Buffer.from('mock-image')),
      }));

      const result = await service.renderForDevice({
        input: Buffer.from('fake-png'),
        width,
        height,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(result.length).toBe(Math.ceil(width / 2) * height);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBe(0x01);
      }
    });

    it('should map Spectra 6 Red to nibble 4 and Blue to nibble 3 to prevent inversion', async () => {
      const width = 2;
      const height = 1;

      // Left pixel: Spectra 6 Red reflectance #871300 (r: 135, g: 19, b: 0)
      // Right pixel: Spectra 6 Blue reflectance #05409E (r: 5, g: 64, b: 158)
      const pixelData = new Uint8ClampedArray([
        135,
        19,
        0,
        255, // Red
        5,
        64,
        158,
        255, // Blue
      ]);

      const mockGetImageData = jest.fn().mockReturnValue({ data: pixelData });
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: () => ({
          drawImage: jest.fn(),
          getImageData: mockGetImageData,
        }),
        toBuffer: jest.fn(() => Buffer.from('mock-image')),
      }));

      const result = await service.renderForDevice({
        input: Buffer.from('fake-png'),
        width,
        height,
        palette: ['#000000', '#ffffff', '#ff0000', '#0000ff'],
        mode: 'ui',
        displayProfile: 'spectra6_7in3',
      });

      expect(result.length).toBe(1);
      // Red nibble = 4 (0x4), Blue nibble = 3 (0x3) -> Packed byte = 0x43
      expect(result[0]).toBe(0x43);
    });

    it('should throw BadRequestException on invalid palette colors', async () => {
      await expect(
        service.renderForDevice({
          input: Buffer.from('fake-png'),
          width: 8,
          height: 8,
          palette: ['#000000', 'invalid'],
          mode: 'ui',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should select vivid preset for ui mode and dynamic preset for photo mode in renderForDevice', async () => {
      const mockDitherImage = ditherImage as jest.Mock;
      mockDitherImage.mockClear();

      await service.renderForDevice({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'photo',
      });

      expect(mockDitherImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ditheringType: 'errorDiffusion',
          processingPreset: 'dynamic',
          colorMatching: 'lab',
        })
      );

      mockDitherImage.mockClear();

      await service.renderForDevice({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(mockDitherImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ditheringType: 'errorDiffusion',
          processingPreset: 'vivid',
          colorMatching: 'lab',
        })
      );
    });
  });
});
