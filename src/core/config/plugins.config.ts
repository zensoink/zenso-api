import * as path from 'node:path';

import { registerAs } from '@nestjs/config';

export default registerAs('plugins', () => ({
  rootDir: process.env.PLUGINS_ROOT_DIR
    ? path.resolve(process.env.PLUGINS_ROOT_DIR)
    : path.resolve(process.cwd(), 'storage', 'plugins'),
}));
