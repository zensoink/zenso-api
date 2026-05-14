import { registerAs } from '@nestjs/config';

export default registerAs('registry', () => ({
  url: process.env.REGISTRY_URL || 'https://registry.zenso.ink',
}));
