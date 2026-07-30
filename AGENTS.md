# AGENTS.md - Zenso API Development Guidelines

## Overview

Zenso API is a **smart widget rendering backend** for IoT devices (e-ink displays). Key constraints:

- Backend-only (no frontend frameworks)
- Server-side rendering with Puppeteer
- LiquidJS templating, Prisma ORM, PostgreSQL

---

## Build & Test Commands

```bash
# Development
pnpm run start:dev        # Watch mode
pnpm run build            # Production build
pnpm run start:prod       # Run compiled

# Linting & Formatting
pnpm run lint             # ESLint check
pnpm run lint:fix         # Auto-fix linting
pnpm run format           # Format code (Prettier)

# Testing
pnpm exec jest --testPathPattern=users.service.spec.ts   # Single test file
pnpm exec jest src/users/users.service.spec.ts --watch  # Watch single test
pnpm run test              # All tests once
pnpm run test:watch        # Watch mode
pnpm run test:cov          # Coverage report
pnpm run test:e2e          # E2E tests

# Database
npx prisma generate         # Regenerate client
npx prisma migrate dev      # Create migration
npx prisma migrate deploy   # Deploy migrations
npx prisma db push          # Sync schema (dev)
npx prisma studio            # DB UI
```

---

## Code Style

### TypeScript Config (from tsconfig.json)

- **Strict mode enabled**: `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`
- **Decorators**: `experimentalDecorators`, `emitDecoratorMetadata`
- **Target**: ES2023, CommonJS modules

### TypeScript Typing Rules

- **No `as` type assertions in production code.** This includes `as Type`, `as unknown as Type`, and double assertions.
- **No angle-bracket type assertions** (`<Type>value`) in production code.
- **Tests may use type assertions sparingly** when mocks or weakly typed libraries make it impractical to avoid them. Typed helpers are preferred.
- Prefer instead:
  - Explicit variable types and function return types
  - Typed helper functions that return the expected type
  - Type guards with `asserts` keyword
  - Runtime transformation functions
  - `satisfies` for compile-time validation of known values
- **`as const` is allowed** only for literal narrowing when no better alternative exists.
- Treat new type assertions as a code smell that requires justification in review.

### Naming Conventions

| Type      | Convention      | Example                         |
| --------- | --------------- | ------------------------------- |
| Files     | kebab-case      | `users.service.ts`              |
| Classes   | PascalCase      | `UsersService`, `CreateUserDTO` |
| Methods   | camelCase       | `createUser()`, `findById()`    |
| Variables | camelCase       | `createUserDto`, `userId`       |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT`               |

---

## NestJS Patterns

### DTOs

- Plain classes (not interfaces)

### Prisma Enums

Always import Prisma enums from `@prisma/client` — never use raw string literals.

```typescript
// Correct
import { DeviceStatus, DeviceClaimStatus } from '@prisma/client';

device.status = DeviceStatus.active;
device.claimStatus = DeviceClaimStatus.claimed;
if (session.status === ClaimSessionStatus.pending) {
  /*...*/
}

// Wrong — raw string literals
device.status = 'active';
device.claimStatus = 'claimed';
if (session.status === 'pending') {
  /*...*/
}
```

When a DTO at the API boundary represents a derived/synthetic status not stored directly in any DB column, define a dedicated Prisma enum for it (e.g. `BootstrapClaimStatus`) to keep all enum references consistent and type-safe.

---

### Prisma Patterns

- Inject `PrismaService` into services (not PrismaClient directly)
- Access models via `this.prismaService.modelName`
- Use `include` for relations, avoid N+1

```prisma
// Prisma schema conventions
model User {
  id    Int @id @default(autoincrement())
  name  String
  email String @unique
}
```

---

## Common Pitfalls

1. **N+1 queries** - Use `include` for relations
2. **Large payloads** - Optimize images for IoT devices (use Sharp)

---

## API Documentation Standards (NestJS Swagger)

Follow best practices from Stripe, GitHub, and Twilio — every endpoint should answer **what**, **why**, and **when**.

### Per-Endpoint Rules

Every `@ApiOperation` MUST include both `summary` and `description`:

- **summary**: One-line imperative verb (`"Register new user"`, `"List user devices"`)
- **description**: 2-4 sentences explaining the _why_ — triggers, side effects, when to use this endpoint

```typescript
@ApiOperation({
  summary: 'Bootstrap a new device',
  description:
    'First call a device makes after power-on. Creates a claim session and returns a URL ' +
    'that the device owner visits to claim the device. Rate-limited to 5 requests per minute.',
})
```

### DTO Field Rules

Every DTO field MUST have `@ApiProperty` or `@ApiPropertyOptional` with:

- **description**: What the field is, in context
- **example**: A **realistic, copy-paste-ready value** (never `"string"` or `0`)
- **nullable**: true if the field can be null
- **enum**: Reference the Prisma enum type when applicable

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { DeviceStatus } from '@prisma/client';

// Request DTO
export class CreateDeviceDto {
  @ApiProperty({ description: 'Device name', example: 'Living Room Display' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

// Response DTO
export class DeviceResponseDto {
  @ApiProperty({ description: 'Current device status', enum: DeviceStatus, example: DeviceStatus.active })
  status!: DeviceStatus;

  @ApiPropertyOptional({ description: 'Last check-in timestamp', example: '2026-07-14T10:30:00.000Z', nullable: true })
  lastSeenAt?: Date | null;
}
```

### Error Response Rules

Every status code needs a `description` — never leave it empty:

```typescript
// Good
@ApiResponse({ status: 404, description: 'Device not found' })

// Bad — no description
@ApiResponse({ status: 404 })
```

Document at minimum: **200/201 for success**, **400 for validation**, **401 for missing/invalid auth**, **404 for not found**, **409 for conflicts**.

### Tag Descriptions

Add tag metadata in `main.ts` after document creation. Every tag gets a one-sentence description.

### API-Level Description

The `DocumentBuilder.setDescription()` in `main.ts` must include:

1. **What the system is** (one sentence)
2. **Auth model overview** (two auth schemes, how to obtain each)
3. **Flow overview** (numbered sequence of the main user journey)

### Checklist Before Merging

- [ ] Every endpoint has `@ApiOperation({ summary, description })`
- [ ] Every DTO field has `@ApiProperty`/`@ApiPropertyOptional` with `description` and `example`
- [ ] Every `@ApiResponse` has a non-empty `description`
- [ ] POST/PATCH endpoints have `@ApiBody({ type })`
- [ ] Response DTOs with `@ApiProperty` have `description` + `example`
- [ ] Auth-endpoints missing `@ApiBearerAuth` have it
- [ ] `pnpm run build` passes after doc changes

---

## Tech Stack (Reference)

```
NestJS 11 | Prisma 7 | PostgreSQL 16 | LiquidJS 10
Puppeteer 24 | Sharp 0.34 | Jest 30 | TypeScript 5.7
```
