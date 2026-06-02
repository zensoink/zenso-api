import { z } from 'zod';

export const registryDistTagsSchema = z
  .object({
    latest: z.string().optional(),
    beta: z.string().optional(),
    next: z.string().optional(),
  })
  .catchall(z.string().optional());

export const registryPluginMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  author: z.object({ name: z.string(), url: z.string().optional() }).optional(),
  thumbnail: z.string().optional(),
  executionMode: z.enum(['local', 'protected']),
  latestVersion: z.string(),
  distTags: registryDistTagsSchema,
});

export const registryPluginVersionSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  checksumSha256: z.string().optional(),
});

export const registryPluginDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  author: z.object({ name: z.string(), url: z.string().optional() }).optional(),
  thumbnail: z.string().optional(),
  executionMode: z.enum(['local', 'protected']),
  schema_version: z.number(),
  core_min: z.string().optional(),
  license: z.string().optional(),
  distTags: registryDistTagsSchema,
  versions: z.array(registryPluginVersionSchema),
});
