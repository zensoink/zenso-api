import { z } from 'zod';

export const pluginManifestAuthorSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
});

export const pluginManifestSchema = z.object({
  $schema: z.string().optional(),
  id: z.string(),
  version: z.string(),
  name: z.string(),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  schema_version: z.number(),
  core_min: z.string(),
  license: z.string().optional(),
  author: pluginManifestAuthorSchema.optional(),
  config_schema: z.record(z.string(), z.unknown()),
  data_sources: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        config: z.record(z.string(), z.unknown()).optional(),
        refresh_ttl: z.number().positive().optional(),
      })
    )
    .optional(),
  capabilities: z.array(z.enum(['script'])).optional(),
});

export type PluginManifestSchema = z.infer<typeof pluginManifestSchema>;
