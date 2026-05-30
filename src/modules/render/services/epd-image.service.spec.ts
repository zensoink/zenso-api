import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createCanvas } from 'canvas';
import { ditherImage } from 'epdoptimize';
import sharp from 'sharp';

import { EpdImageService } from './epd-image.service';

jest.mock('canvas');
jest.mock('epdoptimize');

describe('EpdImageService', () => {
  let service: EpdImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EpdImageService],
    }).compile();
    service = module.get<EpdImageService>(EpdImageService);

    (sharp as unknown as jest.Mock).mockClear();
    (sharp as unknown as jest.Mock).mockReturnValue({
      resize: jest.fn().mockReturnThis(),
      modulate: jest.fn().mockReturnThis(),
      linear: jest.fn().mockReturnThis(),
      flatten: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-processed')),
    });
  });

  describe('renderPreview', () => {
    it('should return PNG from dithered canvas toBuffer', async () => {
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
    });

    it('should skip brightness/contrast preprocessing that renderForDevice applies', async () => {
      const mockSharpChain = {
        resize: jest.fn().mockReturnThis(),
        modulate: jest.fn().mockReturnThis(),
        linear: jest.fn().mockReturnThis(),
        flatten: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-processed')),
      };
      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpChain);

      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
          getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(32 * 4) })),
        })),
        toBuffer: jest.fn(() => Buffer.from('preview-png')),
      }));

      (ditherImage as jest.Mock).mockClear();

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

    it('should always use errorDiffusion dithering regardless of mode', async () => {
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({ drawImage: jest.fn() })),
        toBuffer: jest.fn(() => Buffer.from('png')),
      }));

      (ditherImage as jest.Mock).mockClear();

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
          processingPreset: 'balanced',
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
          processingPreset: 'balanced',
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
      expect(result.length).toBe((width * height) / 2);
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

      expect(result.length).toBe((width * height) / 2);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBe(0x01);
      }
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

    it('should always use errorDiffusion dithering regardless of mode', async () => {
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
          processingPreset: 'balanced',
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
          processingPreset: 'balanced',
          colorMatching: 'lab',
        })
      );
    });
  });
});
