import { z } from 'zod';

export const pluginManifestSchema = z
  .object({
    $schema: z.string().describe('URL of the manifest schema this file conforms to.').optional(),
    id: z
      .string()
      .regex(new RegExp('^[a-z0-9]+/[a-z0-9-]+$'))
      .describe('Unique plugin identifier in owner/repo form, e.g. "zenso/zenso-plugin-calendar".'),
    name: z.string().min(1).describe('Human-readable plugin name shown in the panel.'),
    description: z.string().describe('Short description of what the plugin does.').optional(),
    thumbnail: z.string().describe('Relative path to a preview image bundled with the plugin.').optional(),
    schema_version: z.literal(1).describe('Must match the schema major version in the URL.'),
    version: z.string().regex(new RegExp('^\\d+\\.\\d+\\.\\d+$')).describe('Plugin version (SemVer X.Y.Z).'),
    core_min: z.string().regex(new RegExp('^\\d+\\.\\d+\\.\\d+$')).describe('Minimum Zenso core version required.'),
    license: z.string().optional(),
    author: z.object({ name: z.string(), url: z.url().optional() }).strict().optional(),
    capabilities: z
      .array(z.literal('script'))
      .refine(arr => arr.every((item, i) => arr.indexOf(item) == i), 'All items must be unique!')
      .describe('Runtime capabilities. Currently only "script" (allows bundled .js files).')
      .optional(),
    config_schema: z
      .object({
        type: z.literal('object'),
        properties: z
          .record(
            z.string(),
            z
              .object({
                type: z
                  .enum(['string', 'number', 'boolean', 'array'])
                  .describe('Field type. Rendered as text, number input, toggle, or dynamic list.'),
                description: z.string().optional(),
                default: z.any().describe('Pre-filled value shown in the panel form.').optional(),
                format: z
                  .string()
                  .describe(
                    'Value format hint. "uri" and "color" are rendered by the panel (color = native picker). Planned: date, time, datetime, email.'
                  )
                  .optional(),
                enum: z.array(z.any()).min(1).describe('Allowed values; renders as a dropdown.').optional(),
                minimum: z.number().optional(),
                maximum: z.number().optional(),
                items: z
                  .object({
                    type: z.enum(['string', 'number', 'boolean', 'object']),
                    format: z
                      .string()
                      .describe(
                        'Value format hint. "uri" and "color" are rendered by the panel (color = native picker).'
                      )
                      .optional(),
                    description: z.string().optional(),
                    default: z.any().optional(),
                    enum: z.array(z.any()).min(1).optional(),
                    minimum: z.number().optional(),
                    maximum: z.number().optional(),
                    properties: z
                      .record(
                        z.string(),
                        z
                          .object({
                            type: z.enum(['string', 'number', 'boolean', 'object']),
                            format: z.string().optional(),
                            description: z.string().optional(),
                            default: z.any().optional(),
                            enum: z.array(z.any()).min(1).optional(),
                            minimum: z.number().optional(),
                            maximum: z.number().optional(),
                          })
                          .strict()
                      )
                      .describe(
                        'For object items: map of sub-field name to field definition (same shape as a top-level field).'
                      )
                      .optional(),
                    required: z.array(z.string()).describe('Required sub-field keys for object items.').optional(),
                  })
                  .strict()
                  .describe(
                    'For arrays: the type of each list item. Use "object" to model a list of structured rows (e.g. calendar feeds with url + color).'
                  )
                  .optional(),
              })
              .strict()
          )
          .describe('Map of config field name to field definition. Panel renders one form field per entry.'),
        required: z.array(z.string()).describe('Config field keys that must be present in configJson.').optional(),
        additionalProperties: z
          .union([z.literal(true), z.literal(false)])
          .describe('Whether unknown configJson keys are allowed (default: false in JSON Schema).')
          .optional(),
      })
      .describe(
        'JSON Schema (draft-07) of the plugin instance configuration (configJson). Must declare type "object" and properties. Each property type must be renderable by the Zenso panel: string | number | boolean | array (optionally an array of objects).'
      ),
    data_sources: z
      .array(
        z
          .object({
            id: z.string().min(1),
            type: z.string().min(1).describe('Data source handler. Currently supported: "ics".'),
            config: z
              .record(z.string(), z.any())
              .describe(
                'Source-specific options, e.g. references to configJson field names (urls_field, days_ahead_field).'
              )
              .optional(),
          })
          .strict()
      )
      .optional(),
  })
  .strict()
  .describe(
    'Source of truth for the Zenso plugin manifest contract. Mirrored by zenso-api (zod) and zenso-panel (config form builder).'
  );
export type PluginManifestSchema = z.infer<typeof pluginManifestSchema>;
