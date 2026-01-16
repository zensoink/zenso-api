# AGENTS.md - Development Guidelines for Zenso API

## Zenso API – Development Agents & AI Assistants

This document defines how AI agents, Claude, and development assistants should interact with this codebase. It serves as a **context specification** for LLM-based tools and automated workflows.

---

## 🤖 Agent Identity

### Primary Use Case

Zenso API is a **smart widget rendering backend** for IoT devices. Agents working on this codebase should understand:

- Custom widgets are **data-driven** (user provides data, widget renders it)
- Rendering is **server-side** (Puppeteer on backend, image sent to device)
- Performance is **critical** (IoT devices have limited compute, network)
- Caching is **essential** (hash-based change detection for bandwidth optimization)

### Core Constraints

1. **No frontend** – This is backend-only. No React/Vue/Svelte.
2. **Device-first** – Always consider TRMNL, e-ink display limitations (small screens, low bandwidth).
3. **Templating** – LiquidJS is the standard. No other template engines.
4. **Database** – PostgreSQL + Prisma. TypeORM is deprecated in favor of Prisma.

---

## 📋 Codebase Overview for Agents

### Current Tech Stack (as of Jan 2026)

```
Backend:
  - NestJS 11 (framework)
  - Prisma 7 (ORM)
  - PostgreSQL 16 (database)
  - LiquidJS 10 (templating)
  - Puppeteer 24 (rendering)
  - Sharp 0.34 (image processing)

Testing:
  - Jest 30
  - Supertest 7 (HTTP testing)

Development:
  - TypeScript 5.7
  - ESLint + Prettier
  - ts-node (dev runner)
```

### Do NOT Use

- ❌ TypeORM (deprecated, use Prisma)
- ❌ REST client libraries (use Prisma Client directly)
- ❌ Template engines other than LiquidJS
- ❌ GraphQL (not in roadmap)
- ❌ Frontend frameworks (this is backend-only)
- ❌ localStorage/browser APIs (server-side only)

---

## 📝 Code Style & Conventions

### NestJS Patterns

- Use **services** for business logic
- Use **controllers** for HTTP routes
- Use **DTOs** (Data Transfer Objects) for validation
- Use **guards** for cross-cutting concerns (auth, rate-limit)
- Use **pipes** for input transformation/validation

### Naming Conventions

- **Services**: `WidgetsService`, `DevicesService`, `RenderingService`
- **Controllers**: `WidgetsController`, `DevicesController`
- **DTOs**: `CreateWidgetDto`, `UpdateDeviceDto`
- **Methods**: `createWidget()`, `getUserDevices()`, `renderAndCache()`

### Typing

- Always use **strict typing** (no `any` types unless unavoidable)
- Define interfaces for complex objects
- Use enums for status values

```typescript
// Good
enum WidgetStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

async findPublished(): Promise<Widget[]> {
  return this.prisma.widget.findMany({
    where: { status: WidgetStatus.PUBLISHED }
  });
}

// Bad
async findPublished(): Promise<any[]> {
  return this.prisma.widget.findMany({
    where: { status: 'published' }  // string, no enum
  });
}
```

### Error Handling

- Use NestJS HttpException for HTTP errors
- Create custom exception classes for domain errors
- Always log errors with context

```typescript
import { BadRequestException } from '@nestjs/common';

async validateLiquidTemplate(template: string) {
  try {
    const engine = new Liquid();
    engine.parse(template);
  } catch (error) {
    throw new BadRequestException(`Invalid Liquid template: ${error.message}`);
  }
}
```

---

## 🧪 Testing Guidelines

### Test Structure

- **Unit tests**: Service logic in isolation (mock Prisma)
- **Integration tests**: Service + real Prisma (test database)
- **E2E tests**: Full HTTP flow

### Example: Testing a Service

```typescript
describe('WidgetsService', () => {
  let service: WidgetsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WidgetsService,
        {
          provide: PrismaService,
          useValue: { widget: { findMany: jest.fn() } }  // Mock
        }
      ]
    }).compile();

    service = module.get(WidgetsService);
    prisma = module.get(PrismaService);
  });

  it('should create a widget', async () => {
    const dto = { name: 'Calendar', slug: 'calendar', ... };
    await service.create(dto);

    expect(prisma.widget.create).toHaveBeenCalledWith({
      data: expect.objectContaining(dto)
    });
  });
});
```

### Running Tests

```bash
pnpm run test              # All tests once
pnpm run test:watch       # Watch mode
pnpm run test:cov         # Coverage report
pnpm run test:e2e         # End-to-end tests
```

---

## 🚨 Common Pitfalls (Agents: Avoid These)

1. **Using TypeORM instead of Prisma**
   - ❌ `@Entity()`, `@Column()` decorators
   - ✅ Use `prisma/schema.prisma` instead

2. **N+1 Queries**
   - ❌ Loop + query inside loop
   - ✅ Use `include` or `select` to fetch relations once

3. **Missing validation**
   - ❌ Accept user input without DTOs
   - ✅ Always use class-validators in DTOs

4. **Hardcoding secrets**
   - ❌ Hardcode API keys in code
   - ✅ Use `.env` and `ConfigService`

5. **Forgetting error handling**
   - ❌ Async operations without try-catch
   - ✅ Always catch errors and throw appropriate exceptions

6. **Not considering device constraints**
   - ❌ Send 5MB image to TRMNL
   - ✅ Optimize images, use compression, small payloads

---

## 📦 Dependency Management

### Adding Dependencies

- **For runtime**: `pnpm install <package>`
- **For development**: `pnpm install -D <package>`
- **Update lock file**: Commit `pnpm-lock.yaml`

### Current Dependencies (Reference)

- `@nestjs/*` – NestJS framework
- `@prisma/client` – Database client
- `liquidjs` – Liquid templating
- `puppeteer` – Browser rendering
- `sharp` – Image optimization
- `reflect-metadata` – TypeScript metadata
- `class-validator` – DTO validation
- `class-transformer` – DTO transformation

### Avoid Adding

- ❌ Deprecated packages (check npm for `deprecated` flag)
- ❌ Unmaintained libraries (last update >2 years ago)
- ❌ Packages with many security vulnerabilities
- ✅ Check `pnpm audit` before committing

---

## 🔄 Git & Workflow

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example**:

```
feat(rendering): implement hash-based image caching

- Add SHA256 hashing of widget data
- Skip re-rendering if data unchanged
- Reduces device poll bandwidth by 60%

Fixes #123
```

### Branch Naming

- `feature/widget-marketplace` – New feature
- `fix/polling-timeout` – Bug fix
- `docs/api-reference` – Documentation
- `chore/update-deps` – Maintenance

---

## 🚀 Deployment Notes for Agents

### Environment Variables (Production)

```env
DATABASE_URL=postgresql://user:pass@prod-db.host/zenso_prod
NODE_ENV=production
PORT=3000
PUPPETEER_HEADLESS=true

# Optional
LOG_LEVEL=info
REDIS_URL=redis://...
SENTRY_DSN=https://...
```

### Build & Run

```bash
pnpm run build            # Compile TypeScript
pnpm run start:prod       # Run compiled code

# In Docker
docker build -t zenso-api .
docker run -p 3000:3000 --env-file .env zenso-api
```

### Monitoring

- **Logs**: Check `console.log()` output (or ELK stack)
- **Database**: Monitor PostgreSQL connections
- **Performance**: Track rendering time (Puppeteer overhead)
- **Health**: `GET /health` endpoint (add if missing)

---

## 🔧 Helpful Commands for Agents

### Database

```bash
npx prisma migrate dev --name migration_name   # Create migration
npx prisma migrate deploy                      # Deploy migrations
npx prisma generate                            # Regenerate client
npx prisma studio                              # UI to inspect data
npx prisma db push                             # Sync schema to DB
```

### Development

```bash
pnpm run start:dev        # Watch mode
pnpm run lint             # ESLint check
pnpm run format           # Format code
pnpm run build            # Production build
```

### Testing

```bash
pnpm run test             # Run all tests
pnpm run test:watch       # Watch mode
pnpm run test:cov         # Coverage
pnpm run test:debug       # Debug mode
```

---

## 📞 Questions for Agents

When working on new features, ask yourself:

1. **Does this affect device polling?** → Consider bandwidth impact
2. **Do I need a database change?** → Create Prisma migration
3. **Should this be cached?** → Use hash-based caching
4. **Is input validated?** → Use DTOs with class-validators
5. **Is this tested?** → Add unit + E2E tests
6. **Is error handling present?** → Throw appropriate exceptions
7. **Does this follow NestJS patterns?** → Use services/controllers/guards
8. **Are relations efficient?** → Avoid N+1 queries

---

## 🎯 Agent Workflow Template

When asked to implement a feature:

1. **Understand requirements** – Read issue/task carefully
2. **Plan database changes** – Update `prisma/schema.prisma` if needed
3. **Create migration** – `npx prisma migrate dev --name feature_name`
4. **Implement service** – Add business logic to appropriate service
5. **Expose via controller** – Add HTTP endpoints
6. **Write tests** – Add unit + E2E tests
7. **Update documentation** – If API changes, update this doc
8. **Code review** – Ensure code follows style guide
9. **Test manually** – `pnpm run start:dev` and test endpoints
10. **Commit & push** – Follow git workflow above

---

**Last Updated**: January 2026
**Version**: 1.0
**Audience**: AI Agents, Claude, LLMs working on zenso-api codebase
