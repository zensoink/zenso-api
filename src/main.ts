import { HttpExceptionFilter } from '@core/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET, PUT, POST, DELETE, PATCH',
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
    .setDescription('REST API for Zenso e-paper display system')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'user-jwt')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'device-jwt')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
