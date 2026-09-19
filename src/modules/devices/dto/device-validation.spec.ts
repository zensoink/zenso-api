import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateDeviceDto } from './create-device.dto';
import { UpdateDeviceDto } from './update-device.dto';

describe('Device DTO Validation Contracts', () => {
  describe('CreateDeviceDto', () => {
    it('should validate a valid CreateDeviceDto with 7-color custom palette', async () => {
      const dto = plainToInstance(CreateDeviceDto, {
        hardware_id: 'E45F01234567',
        name: 'My Custom Display',
        displayProfile: 'custom',
        palettePreset: 'custom',
        palette: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00', '#FFA500'],
        width: 800,
        height: 480,
        rotation: 0,
        refreshRate: 300,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject palette with more than 7 colors', async () => {
      const dto = plainToInstance(CreateDeviceDto, {
        hardware_id: 'E45F01234567',
        name: 'Display',
        palette: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00', '#FFA500', '#FF00FF'],
      });

      const errors = await validate(dto);
      const paletteError = errors.find(e => e.property === 'palette');
      expect(paletteError).toBeDefined();
      expect(paletteError?.constraints?.arrayMaxSize).toBeDefined();
    });

    it('should reject palette with fewer than 2 colors', async () => {
      const dto = plainToInstance(CreateDeviceDto, {
        hardware_id: 'E45F01234567',
        name: 'Display',
        palette: ['#000000'],
      });

      const errors = await validate(dto);
      const paletteError = errors.find(e => e.property === 'palette');
      expect(paletteError).toBeDefined();
      expect(paletteError?.constraints?.arrayMinSize).toBeDefined();
    });

    it('should reject palette with duplicate colors', async () => {
      const dto = plainToInstance(CreateDeviceDto, {
        hardware_id: 'E45F01234567',
        name: 'Display',
        palette: ['#000000', '#000000', '#FFFFFF'],
      });

      const errors = await validate(dto);
      const paletteError = errors.find(e => e.property === 'palette');
      expect(paletteError).toBeDefined();
      expect(paletteError?.constraints?.arrayUnique).toBeDefined();
    });

    it('should reject invalid displayProfile identifier', async () => {
      const dto = plainToInstance(CreateDeviceDto, {
        hardware_id: 'E45F01234567',
        name: 'Display',
        displayProfile: 'non_existent_profile',
      });

      const errors = await validate(dto);
      const profileError = errors.find(e => e.property === 'displayProfile');
      expect(profileError).toBeDefined();
      expect(profileError?.constraints?.isIn).toBeDefined();
    });
  });

  describe('UpdateDeviceDto', () => {
    it('should validate valid update with minimum 2-color palette', async () => {
      const dto = plainToInstance(UpdateDeviceDto, {
        palette: ['#000000', '#FFFFFF'],
        palettePreset: 'mono',
        displayProfile: 'mono_800x480',
        rotation: 90,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject palette exceeding 7 colors on update', async () => {
      const dto = plainToInstance(UpdateDeviceDto, {
        palette: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888'],
      });

      const errors = await validate(dto);
      const paletteError = errors.find(e => e.property === 'palette');
      expect(paletteError).toBeDefined();
      expect(paletteError?.constraints?.arrayMaxSize).toBeDefined();
    });

    it('should reject invalid rotation values', async () => {
      const dto = plainToInstance(UpdateDeviceDto, {
        rotation: 45,
      });

      const errors = await validate(dto);
      const rotationError = errors.find(e => e.property === 'rotation');
      expect(rotationError).toBeDefined();
      expect(rotationError?.constraints?.isIn).toBeDefined();
    });

    it('should reject invalid palettePreset values', async () => {
      const dto = plainToInstance(UpdateDeviceDto, {
        palettePreset: 'rainbow',
      });

      const errors = await validate(dto);
      const presetError = errors.find(e => e.property === 'palettePreset');
      expect(presetError).toBeDefined();
      expect(presetError?.constraints?.isIn).toBeDefined();
    });
  });
});
