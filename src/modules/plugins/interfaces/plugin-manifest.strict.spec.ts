import { strictPluginManifestSchema } from './plugin-manifest.strict';

const strictManifest = {
  id: 'zenso/hello-world',
  version: '1.0.0',
  name: 'Hello World',
  schema_version: 1,
  core_min: '1.0.0',
  config_schema: { type: 'object', properties: {} },
};

describe('strictPluginManifestSchema (regeneration-safe backend enforcement)', () => {
  it('accepts a complete valid manifest', () => {
    expect(strictPluginManifestSchema.safeParse(strictManifest).success).toBe(true);
  });

  it.each([['id'], ['name'], ['version']])('rejects a manifest without %s', field => {
    const rest: Record<string, unknown> = { ...strictManifest };
    delete rest[field];

    expect(strictPluginManifestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-SemVer version and empty name', () => {
    expect(strictPluginManifestSchema.safeParse({ ...strictManifest, version: '1.0' }).success).toBe(false);
    expect(strictPluginManifestSchema.safeParse({ ...strictManifest, name: '' }).success).toBe(false);
  });

  it('still rejects unknown top-level keys (extend preserved strict)', () => {
    expect(strictPluginManifestSchema.safeParse({ ...strictManifest, unknown_field: true }).success).toBe(false);
  });
});
