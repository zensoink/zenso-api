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
      const mockPngBuffer = Buffer.from('mock-png-output');

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
      expect(ditherImage).toHaveBeenCalledTimes(1);
    });

    it('should always call ditherImage regardless of mode', async () => {
      (createCanvas as jest.Mock).mockImplementation(() => ({
        getContext: jest.fn(() => ({ drawImage: jest.fn() })),
        toBuffer: jest.fn(() => Buffer.from('png')),
      }));

      const mockDitherImage = ditherImage as jest.Mock;
      mockDitherImage.mockClear();

      await service.renderPreview({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'photo',
      });

      expect(mockDitherImage).toHaveBeenCalledTimes(1);

      mockDitherImage.mockClear();

      await service.renderPreview({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(mockDitherImage).toHaveBeenCalledTimes(1);
    });

    it('should use errorDiffusion dithering for photo mode', async () => {
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
        mode: 'photo',
      });

      expect(ditherImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ ditheringType: 'errorDiffusion' })
      );
    });

    it('should use quantizationOnly dithering for ui mode', async () => {
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
        expect.objectContaining({ ditheringType: 'quantizationOnly' })
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

    it('should use errorDiffusion dithering for photo mode', async () => {
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
        expect.objectContaining({ ditheringType: 'errorDiffusion' })
      );
    });

    it('should use quantizationOnly dithering for ui mode', async () => {
      const mockDitherImage = ditherImage as jest.Mock;
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
        expect.objectContaining({ ditheringType: 'quantizationOnly' })
      );
    });

    it('should always call ditherImage regardless of mode', async () => {
      const mockDitherImage = ditherImage as jest.Mock;
      mockDitherImage.mockClear();

      await service.renderForDevice({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'photo',
      });

      expect(mockDitherImage).toHaveBeenCalledTimes(1);

      mockDitherImage.mockClear();

      await service.renderForDevice({
        input: Buffer.from('fake-png'),
        width: 8,
        height: 8,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(mockDitherImage).toHaveBeenCalledTimes(1);
    });
  });
});
