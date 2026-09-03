import { HttpExceptionFilter } from '@core/filters/http-exception.filter';
import { PrivateNetworkAccessInterceptor } from '@core/interceptors/private-network-access.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.FRONTEND_URL ?? 'http://localhost:4200';

  if (process.env.NODE_ENV !== 'production') {
    app.useGlobalInterceptors(new PrivateNetworkAccessInterceptor());
  }

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET, PUT, POST, DELETE, PATCH, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.enableShutdownHooks();

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Zenso API')
    .setDescription(
      'REST API for the Zenso e-paper display system.\n\n' +
        'Zenso is a smart widget rendering backend for IoT e-ink displays. ' +
        'It manages devices, screens, plugins, and the rendering pipeline — ' +
        'from LiquidJS template execution through Puppeteer rendering to EPD-optimized image output.\n\n' +
        '## Authentication\n\n' +
        'Two bearer-token auth schemes:\n' +
        '- **user-jwt** — obtained via `POST /auth/login` (email + password). Used for all user-facing CRUD (devices, screens, plugins).\n' +
        '- **device-jwt** — obtained via `POST /auth/device/login` (hardware_id + secret). Used by physical devices for check-in and display fetch.\n\n' +
        '## Flow overview\n\n' +
        '1. **Bootstrap** — A new device calls `POST /device/bootstrap` to create a claim session.\n' +
        '2. **Claim** — A user claims the device via the claim URL (manual or programmatic).\n' +
        '3. **Configure** — The user creates screens, installs plugins, and assigns plugin instances to screen slots.\n' +
        '4. **Render** — Devices poll `POST /devices/check-in` for config, then fetch rendered display images via `GET /devices/display`.\n\n' +
        'See individual endpoint descriptions for details.'
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'user-jwt')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'device-jwt')
    .build();

  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, config);
    document.tags = [
      { name: 'auth', description: 'Authentication — user and device login, token refresh, logout' },
      { name: 'users', description: 'User management — registration only (profile management TBD)' },
      { name: 'devices', description: 'Device lifecycle — create, list, check-in, display fetch, secret rotation' },
      { name: 'screens', description: 'Screen and slot management — layout composition and configuration' },
      { name: 'Bootstrap', description: 'Device bootstrap flow — initial provisioning (public endpoints)' },
      { name: 'Claim', description: 'Device claiming — user binds a device to their account' },
      { name: 'plugins', description: 'Plugin registry and lifecycle — install, uninstall, import from ZIP' },
      { name: 'plugin-instances', description: 'Plugin instance configuration — per-plugin settings and assignment' },
    ];
    return document;
  };
  SwaggerModule.setup('api', app, documentFactory);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
