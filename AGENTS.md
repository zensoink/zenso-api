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

### Formatting (from .prettierrc)

- 2 spaces, no tabs
- Single quotes
- Semicolons required
- 120 char line width
- Trailing commas (ES5)
- Arrow parens: avoid when unnecessary

### Import Order (enforced by eslint-plugin-simple-import-sort)

1. NestJS/External packages (`@nestjs/*`, `node_modules`)
2. Relative imports (`./`, `../`)
3. **Sort within groups alphabetically**

```typescript
// Correct import order
import { Body, Controller, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { UsersService } from './users.service';
```

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

### Module Structure

```typescript
@Controller('resource') // HTTP routes
export class XxxController {
  constructor(private readonly xxxService: XxxService) {}
}

@Injectable()
export class XxxService {
  constructor(private readonly prismaService: PrismaService) {}
}

@Module({}) // Combine controller + service
export class XxxModule {}
```

### DTOs

- Plain classes (not interfaces)
- No validation decorators in current codebase (add as needed)

### Prisma Patterns

- Inject `PrismaService` into services (not PrismaClient directly)
- Access models via `this.prismaService.modelName`
- Use `include` for relations, avoid N+1

```typescript
// Prisma schema conventions
model User {
  id    Int @id @default(autoincrement())
  name  String
  email String @unique
}
```

### Error Handling

- Use NestJS `HttpException` classes
- No raw `console.log` in production (use Logger)
- Always catch async errors

---

## Testing Patterns

### Unit Test Structure

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockPrismaService = {
      user: { create: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get(UsersService);
  });

  it('should create a user', async () => {
    const dto: CreateUserDTO = { name: 'John', email: 'john@example.com' };
    mockPrismaService.user.create.mockResolvedValue({ id: 1, ...dto });

    const result = await service.createUser(dto);

    expect(mockPrismaService.user.create).toHaveBeenCalledWith({ data: dto });
    expect(result.email).toBe('john@example.com');
  });
});
```

---

## Common Pitfalls

1. **TypeORM** - Use Prisma schema, not decorators
2. **N+1 queries** - Use `include` for relations
3. **Missing validation** - Add DTOs with class-validators
4. **Hardcoded secrets** - Use `.env` + ConfigService
5. **Large payloads** - Optimize images for IoT devices (use Sharp)
6. **No error handling** - Wrap async operations in try-catch

---

## Git Workflow

### Commit Messages (Conventional Commits)

```
feat(users): add user registration endpoint
fix(rendering): resolve timeout on large images
chore(deps): update prisma to v7.3
```

### Branch Naming

- `feature/widget-marketplace`
- `fix/polling-timeout`
- `chore/update-deps`

---

## Tech Stack (Reference)

```
NestJS 11 | Prisma 7 | PostgreSQL 16 | LiquidJS 10
Puppeteer 24 | Sharp 0.34 | Jest 30 | TypeScript 5.7
```
