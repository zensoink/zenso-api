import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import 'dotenv/config';
import { jsonSchemaToZod } from 'json-schema-to-zod';

const here = dirname(fileURLToPath(import.meta.url));

const SCHEMA_URL = process.env.ZENSO_MANIFEST_SCHEMA_URL;
if (!SCHEMA_URL) {
  throw new Error('ZENSO_MANIFEST_SCHEMA_URL is not set (add it to .env).');
}
const OUT = resolve(here, '../src/modules/plugins/interfaces/plugin-manifest.schema.ts');

const res = await fetch(SCHEMA_URL);
if (!res.ok) {
  throw new Error(`Failed to fetch manifest schema from ${SCHEMA_URL}: HTTP ${res.status}`);
}
const schema = await res.json();

let code = jsonSchemaToZod(schema, {
  name: 'pluginManifestSchema',
  module: 'esm',
  type: true,
  zodVersion: 4,
});

// json-schema-to-zod may emit v3-style format chains; normalize to zod v4 top-level helpers.
code = code.replaceAll('z.string().url()', 'z.url()').replaceAll('z.string().email()', 'z.email()');

writeFileSync(OUT, `/* eslint-disable */\n${code}`);
console.log(`Generated ${OUT} from ${SCHEMA_URL}`);
