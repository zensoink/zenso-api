# TMP — New plugin structure adoption + isolated-vm safety (implementation plan)

> Context: `zenso-plugin-template` overhaul (Vite build, `zenso.config.json` +
> `package.json` → generated `dist/manifest.json`, `dist/index.liquid` full-doc,
> `assets/*`, root `favicon.ico`/`README.md`/`LICENSE` in `plugin.zip`).
> Backend (`zenso-api`) must adopt the new contract. `isolated-vm` added for
> defense-in-depth around author-controlled code.
> Delete this file once all boxes are ticked.

## A. Template context alignment (breaking today — new plugins render empty)

- [x] `context-aggregation.service.ts`: emit canonical snake_case `zenso` scope
      (`time_zone_iana`, `utc_offset`, `timestamp_utc`, `language`, `locale`,
      `device.width/height/orientation`) matching `mock/zenso.json`
- [x] Same service: build `plugin:{id,name,version,description,author,…}`
      from `manifestJson` + `pluginVersion` (replaces/augments `manifest` scope)
- [x] Same service: replace hardcoded `firstName:'Tytus'`, `locale:'pl-PL'`,
      `language:'pl'` with real user/screen values, keep literals as fallback only
- [x] `plugin-execution.service.ts`: nest resolved sources under `data`
      (`{ data: merged }`) instead of flat `Object.assign`
- [x] Transition aliases (recommended, remove next release): keep `manifest`
      scope + camelCase keys + flat source keys alongside new ones
- [x] Update `context-aggregation.service.spec.ts`,
      `plugin-execution.service.spec.ts` to new shapes (both scopes during transition)

## B. Manifest `id` / `version` strictness (backend is the last gate)

- [x] Keep `plugin-manifest.schema.ts` requiring `id` + `name` + `version` +
      `schema_version` + `core_min` — canonical schema
      (`https://schemas.zenso.ink/v1/plugin-manifest.schema.json`,
      `required: ["id","schema_version","core_min","config_schema"]`) does NOT
      require `name`/`version`; `buildManifestJson()` in the vite plugin passes
      `id` through unvalidated (`package.json` `name`/`version` fail fast at build,
      `id` does not — a broken config yields a manifest with no `id`)
- [x] Add code comment on the zod schema documenting the intentional
      strictness divergence so a future "sync with remote schema" diff can't relax it
- [x] Add validator rejection tests: manifest without `id` → 400, without
      `version` → 400
- [x] `plugin-import.service.ts` (zip path): persist `description`, `authorUrl`,
      `thumbnail`, `coreMin`, `license` from manifest (columns exist; protected-registry
      path in `plugins.service.ts` already fills them — mirror it)

## C. Render pipeline fixes for new `dist/` output

- [x] `html-to-image.service.ts`: skip `getWidgetTemplate()` wrapping when rendered
      output is a full document (`<!doctype html` / `<html`), keep wrap for fragments
- [x] `browser.service.ts`: enable the `file://` request guard whenever `assetDir`
      exists (today only when `waitForReady=true`); keep `__ZENSO_READY__` wait gated
      on the `script` capability. Covers relative `assets/styles.css` / `assets/main.js`
- [x] Validator specs: add dist-shaped pass fixture (`index.liquid`, generated
      `manifest.json`, `assets/main.js|styles.css|logo.png`, `favicon.ico`,
      `README.md`, `LICENSE`) incl. explicit allow of `.md` + extensionless files
- [x] Decide: `README.md`/`LICENSE` stay on disk only (unserved — recommended)
      vs served via assets allowlist / plugin-docs endpoint

## D. isolated-vm safety (new dependency)

Threat model: author JS runs in Chromium (sandboxed). Node never evals author
code. isolated-vm covers: (D1) import-time screening, (D2) server-side eval of
author-influenced logic behind a single service. It does NOT replace Chromium.

- [x] `pnpm add isolated-vm` + add to `onlyBuiltDependencies` in `package.json`
      (native module; verify prebuilds for dev darwin/arm64 AND prod linux/x64 —
      check `Dockerfile` builds or pulls prebuilds, else `docker build` breaks)
- [x] New `IsolateService` (`src/modules/plugins/services/isolate.service.ts`):
      pooled `ivm.Isolate` instances (`memoryLimit: 16–32MB`), `createContext` per
      run, `compileScript` + `run`/`apply` with `timeout: 1000–5000ms`, minimal jail
      globals (no `fetch`, no `fs`, no `process`), host callbacks via `ivm.Callback`
      only where needed; dispose contexts, cap pool size (isolates are ~MBs each)
- [x] D1 — import-time screen in `PluginValidatorService` (after existing checks):
      `compileScriptSync` the bundled `assets/main.js` (syntax gate, free) +
      optional execution against DOM-stub jail asserting it touches only the stub API
      and sets `__ZENSO_READY__`; failure = reject (strict) or warn (lenient —
      decide, recommend warn-first release)
- [x] D2 — route any server-side evaluation of author-influenced values
      (future `data_sources` transform expressions, computed config defaults)
      through `IsolateService`; no direct `eval`/`new Function` anywhere (grep-gate)
- [x] Timeouts as backstop where isolates don't fit: Liquid `parseAndRender`
      wrapped in `Promise.race` timeout (hostile `{% for %}` ranges = CPU DoS today)
- [x] Tests: `isolate.service.spec.ts` (timeout kills infinite loop, memory hog
      throws, jail has no Node globals, host callback works); validator screen
      tests with real `dist/assets/main.js`; note: native binding under jest —
      mock `isolated-vm` if the binding won't load in CI
- [x] Docs: Swagger/`AGENTS.md` note on script screening behaviour + limits

## E. Repo hygiene

- [x] Add `LICENSE` (MIT, matches template + existing README claim; `package.json`
      currently says `UNLICENSED` — align the field)
- [x] Document the plugin contract for backend readers (`README.md` or `AGENTS.md`):
      zip layout (incl. docs), manifest field sources, context table, `asset_url`,
      `__ZENSO_READY__`, isolated-vm screening

## F. Verification

- [x] `pnpm run build` passes
- [x] `pnpm run test` passes (incl. new specs)
- [x] Manual: build template (`npm run build`), upload live `plugin.zip`
      (9 entries) via `POST /plugins/import/zip`, render a screen with it,
      confirm no empty fields and screenshot is complete
- [x] `docker compose build backend` passes (native `isolated-vm` prebuild check)

## Decisions (open)

- [ ] README hello page: disk-via-assets (recommended, sec. I) vs DB column?
- [ ] Icon/thumbnail/readme URLs: relative (recommended) vs absolute with host?
- [ ] JS screen: warn-first (current) vs strict reject?
- [ ] Deep uninstall: `force=true` deletes all instances (recommended) vs only unassigned ones?
- [ ] Orphan visibility for the panel (`screenIds`/`slotCount` on instance list): needed or force flag alone enough?

## G. Plugin icons for the frontend (favicon + PNG sizes)

Template ships `favicon.ico` at zip root; authors may also add
`favicon-32x32.png` / `favicon-16x16.png` (referenced as
`<link rel="icon" type="image/png" sizes="32x32|16x16" ...>`).
Backend must tell the frontend which icons exist so it can render them.

- [x] `plugin-assets.controller.ts`: add `.ico` → `image/x-icon` to
      `ALLOWED_EXTENSIONS` + `MIME_TYPES` (`.png` sizes already served, no change)
- [x] `InstalledPluginResponseDto`: add `thumbnailUrl: string | null`
      (manifest `thumbnail`, e.g. `assets/logo.png`, resolved to
      `/plugins/assets/{slug}/{selectedVersion}/{path}`) and
      `icons: Array<{ src: string; sizes: string; type: string }>` built by
      probing, in order, `favicon.ico` (`sizes: "any"`, `type: "image/x-icon"`),
      `favicon-32x32.png` (`"32x32"`, `"image/png"`),
      `favicon-16x16.png` (`"16x16"`, `"image/png"`) via
      `PluginStorageService.pathExists` on the selected version; empty array when
      none present (old plugins stay valid)
- [x] `PluginsService.toInstalledPluginResponse`: wire both fields; document
      in field descriptions that URLs are relative (frontend prefixes API host)
- [x] Spec asserting icons list for full/partial/absent icon sets
- [x] No validator change (icons optional)

## H. Regeneration-safe `id`/`version` enforcement (`generate:manifest`)

`scripts/generate-plugin-manifest.mjs` rewrites `plugin-manifest.schema.ts`
from scratch, so hand-edits there (incl. the section-B strictness comment)
are wiped on every run. Keep generation working AND enforcement intact:

- [x] Leave `plugin-manifest.schema.ts` 100% generated (pure mirror, wiping harmless)
- [x] New hand-written `plugin-manifest.strict.ts`:
      `pluginManifestSchema.extend({ id, name, version })` overriding just those
      three as required (SemVer regexes, non-empty name) + moved divergence comment
- [x] Switch validator/import/consumers to the strict wrapper; generated file
      imported only by the wrapper
- [x] Spec pins the override (rejects missing `id`/`version`, still rejects
      unknown keys — verifies `.extend()` preserved `.strict()`), so a remote-schema
      change that breaks enforcement fails loudly, not silently
- [x] Optional: `generate:manifest` runs the schema spec post-generation

## I. Plugin `README.md` as frontend hello page (supersedes section-C disk-only decision)

- [x] `plugin-assets.controller.ts`: add `.md` → `text/markdown; charset=utf-8`
      to allowlist (short/no-cache, not immutable); missing file stays 404
- [x] `InstalledPluginResponseDto`: add `readmeUrl: string | null`
      (`/plugins/assets/{slug}/{selectedVersion}/README.md`, null when absent via
      `pathExists`) so the frontend knows when to show the hello tab
- [x] No DB migration, no import change; frontend renders the markdown
- [x] `README.md` plugin-contract docs: document the hello-page fields

## J. Case convention: `core_min` vs `coreMin`

Rule (no rename — each side already follows its ecosystem's convention):

- Wire = snake_case: manifest JSON, remote schema, Liquid context
  (`plugin.core_min`, `zenso.user.time_zone_iana`) — dictated by template contract
- Code/DB = camelCase: Prisma columns (`coreMin`, `authorUrl`), TS, DTOs —
  dictated by Prisma/TS conventions; translation only at the two boundaries
  (`PluginImportService`, `ContextAggregationService`)

- [x] Document the rule in `README.md` plugin-contract section with the two
      boundary locations, to stop future drift

## K. Deep uninstall (blocked by orphaned instances + leaked disk files)

Symptom: `DELETE /plugins/installed/:id` → 409 "in use by 1 plugin instance(s)"
even after removing the slot from the screen. Root cause: slot deletion
(`ScreenSlotsService.delete`, documented in `screens.controller.ts`) removes only
the `ScreenSlot` — the `PluginInstance` survives as an orphan (cascade is
instance→slots, never slots→instance), and `uninstall` counted those rows.
Additionally `uninstall` deleted only DB rows; version directories on disk leaked.

Decided semantics: uninstall auto-removes instances NOT placed on any screen and
succeeds; it 409s only when an instance is still assigned to a screen. No force
flag needed.

- [x] `PluginsService.uninstall`: load instances with `screenSlots`; 409 only when
      an instance has slots; otherwise `deleteMany` orphan instances + versions +
      plugin in one transaction
- [x] Disk cleanup: `PluginStorageService.deletePluginDir(slug)` called from
      `uninstall` always (fixes the leak on every path)
- [x] Return `{ message, pluginId, deletedInstances }` for panel confirmation
- [x] Specs: orphans auto-removed + dir deleted; no instances → clean uninstall;
      assigned instance → 409 with no DB/disk mutation
- [x] Docs: Swagger `uninstall` description + 409 text updated

## L. Old-code removal (backend-only, no deprecation)

Dropped the cross-repo camelCase rename: not worth 5 repos of churn for taste.
The sec. J boundary rule stands (wire snake_case, code camelCase). What goes away
is the transition debt inside this repo — old shapes rejected outright, fresh code:

- [x] `ContextAggregationService`: snake_case-only keys + `plugin` scope + `data`
      nesting (transition aliases deleted, not deprecated)
- [x] `PluginExecutionService`: drop flat `Object.assign` merge
- [x] `HtmlToImageService`: drop `isFullDocument` + wrap branch, pass HTML straight;
      delete `render/templates/plugin-iframe.template.ts` (+ index export)
- [x] `PluginValidatorService`: delete `normalizeConfigSchema`
      (new builds always emit `{type, properties}`; bare `{}` now 400s)
- [x] Delete dead `interfaces/plugin-manifest.ts` (zero importers, pre-zod relic)
- [x] Specs rewritten to new-only shapes (`context-aggregation`,
      `plugin-execution`, validator `manifestWith` uses full `config_schema` form)
- [x] README: replace "legacy aliases still work" with the new-only contract
- [x] Verify: build, full suite, lint, live-`plugin.zip` end-to-end;
      old-shape (camelCase/`manifest`/flat) template renders nothing by design
