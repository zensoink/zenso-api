import { DeviceLoginDto } from '@modules/auth/dto/device-login.dto';
import { BootstrapRequestDto } from '@modules/bootstrap/dto/bootstrap-request.dto';
import { CreateDeviceDto } from '@modules/devices/dto/create-device.dto';
import { validate } from 'class-validator';

// Cross-boundary contract: firmware is the sole author of hardware IDs and
// always sends the canonical 12-char uppercase MAC without separators.
// These DTOs validate the format and never transform it.
describe('hardware_id contract', () => {
  const valid = 'E45F01234567';
  // Decimal ASCII-code concatenation produced by the former firmware bug
  // (String::operator+=(int) on toupper() output).
  const mangled = '694855506549705751494856';
  const colonForm = 'e4:5f:01:23:45:67';

  function makeDto(Ctor: new () => object, hardware_id: string): object {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const dto = new Ctor() as Record<string, unknown>;
    dto.hardware_id = hardware_id;
    if ('name' in dto) {
      dto.name = 'Test Device';
    }
    if ('secret' in dto) {
      dto.secret = 'test-secret';
    }
    return dto;
  }

  const cases: Array<[string, new () => object]> = [
    ['BootstrapRequestDto', BootstrapRequestDto],
    ['CreateDeviceDto', CreateDeviceDto],
    ['DeviceLoginDto', DeviceLoginDto],
  ];

  describe.each(cases)('%s', (_name, Ctor) => {
    it('accepts the canonical MAC', async () => {
      await expect(validate(makeDto(Ctor, valid))).resolves.toEqual([]);
    });

    it('rejects the decimal-mangled ID', async () => {
      const errors = await validate(makeDto(Ctor, mangled));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects colon-separated lowercase form', async () => {
      const errors = await validate(makeDto(Ctor, colonForm));
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
