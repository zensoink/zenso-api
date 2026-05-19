import { registerAs } from '@nestjs/config';

export default registerAs('seed', () => ({
  pluginUrl:
    process.env.SEED_PLUGIN_URL ||
    'https://github.com/zensoink/zenso-plugin-template/releases/download/v0.0.0/plugin.zip',
}));
