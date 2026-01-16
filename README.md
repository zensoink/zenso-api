<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A specialized backend service for rendering and delivering custom widgets to IoT devices.</p>

## Description

**Zenso API** is a specialized backend service for rendering and delivering custom widgets to IoT devices. It combines server-side rendering capabilities with efficient caching mechanisms to provide dynamic, data-driven content optimized for resource-constrained environments.

### Key Features

- **Server-side widget rendering** with Puppeteer
- **LiquidJS templating** for dynamic content generation
- **Image optimization** with Sharp for efficient delivery
- **Hash-based caching** for bandwidth efficiency
- **PostgreSQL + Prisma** for robust data persistence
- **Device-first architecture** optimized for IoT constraints

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 + Prisma 7
- **Rendering**: Puppeteer 24 + Sharp 0.34
- **Templating**: LiquidJS 10
- **Testing**: Jest 30 + Supertest 7
- **Language**: TypeScript 5.7

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- pnpm

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/zenso_db"
NODE_ENV=development
PORT=3000
```

### Database Setup

```bash
# Install dependencies
$ pnpm install

# Set up database
$ npx prisma migrate dev
$ npx prisma generate
```

### Development Commands

```bash
# Start development server with hot reload
$ pnpm run start:dev

# Run tests
$ pnpm run test

# Lint and format code
$ pnpm run lint
$ pnpm run format
```

## Architecture

Zenso API follows a modular NestJS architecture designed for scalability:

```
src/
├── modules/          # Feature modules (widgets, devices, rendering)
├── common/           # Shared utilities and guards
├── config/           # Configuration services
└── main.ts           # Application bootstrap
```

### Key Components

- **Widget System**: Template validation, rendering pipeline
- **Device Management**: Registration, polling, status tracking
- **Rendering Engine**: Puppeteer-based image generation
- **Caching Layer**: Hash-based change detection

## Development Guidelines

For comprehensive development guidelines, coding standards, and project conventions, see **[AGENTS.md](./AGENTS.md)**.

This document includes:

- Code style and TypeScript guidelines
- Testing conventions
- Database schema patterns
- IoT-specific optimization practices
- Agent workflow templates

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Resources

- **[AGENTS.md](./AGENTS.md)** - Complete development guidelines
- [NestJS Documentation](https://docs.nestjs.com) - Framework reference
- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM guide
- [Puppeteer Documentation](https://pptr.dev) - Browser automation
- [LiquidJS Documentation](https://liquidjs.com) - Templating engine

## Contributing

1. Review [AGENTS.md](./AGENTS.md) for development guidelines
2. Follow conventional commit format
3. Add tests for new features
4. Update documentation as needed

## License

This project is licensed under the MIT License.
