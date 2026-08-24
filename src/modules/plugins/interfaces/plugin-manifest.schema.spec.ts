import { pluginManifestSchema } from './plugin-manifest.schema';

const validConfigSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Heading' },
  },
  required: ['title'],
} as const;

const validManifest = {
  id: 'zenso/hello-world',
  version: '1.0.0',
  name: 'Hello World',
  schema_version: 1,
  core_min: '1.0.0',
  config_schema: validConfigSchema,
  data_sources: [{ id: 'cal', type: 'ics', config: { urls_field: 'title' } }],
  author: { name: 'Zenso', url: 'https://zenso.dev' },
};

describe('pluginManifestSchema (generated from JSON contract)', () => {
  it('accepts a complete valid manifest', () => {
    expect(pluginManifestSchema.safeParse(validManifest).success).toBe(true);
  });

  it('accepts an empty config_schema normalized form', () => {
    expect(
      pluginManifestSchema.safeParse({ ...validManifest, config_schema: { type: 'object', properties: {} } }).success
    ).toBe(true);
  });

  it.each([
    ['id missing slash', { ...validManifest, id: 'hello-world' }],
    ['id with uppercase', { ...validManifest, id: 'Zenso/hello' }],
    ['non-semver version', { ...validManifest, version: '1.0' }],
    ['non-semver core_min', { ...validManifest, core_min: 'v1' }],
    ['schema_version != 1', { ...validManifest, schema_version: 2 }],
    ['missing config_schema', { ...validManifest, config_schema: undefined }],
    ['config_schema missing type', { ...validManifest, config_schema: { properties: {} } }],
    ['data_source missing type', { ...validManifest, data_sources: [{ id: 'cal' }] }],
    ['author.url not a uri', { ...validManifest, author: { name: 'Zenso', url: 'not-a-uri' } }],
  ])('rejects invalid manifest: %s', (_label, manifest) => {
    expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    expect(pluginManifestSchema.safeParse({ ...validManifest, unknown_field: true }).success).toBe(false);
  });
});
