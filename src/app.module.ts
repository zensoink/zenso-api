import { appConfig, authConfig, pluginsConfig, registryConfig, seedConfig } from '@core/config';
import { PrismaModule } from '@core/prisma';
import { SeedModule } from '@core/seed';
import { AuthModule } from '@modules/auth';
import { BootstrapModule } from '@modules/bootstrap/bootstrap.module';
import { ClaimModule } from '@modules/claim/claim.module';
import { DevicesModule } from '@modules/devices';
import { PluginInstancesModule } from '@modules/plugin-instances';
import { PluginsModule } from '@modules/plugins';
import { RenderModule } from '@modules/render';
import { ScreensModule } from '@modules/screens';
import { UsersModule } from '@modules/users';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, pluginsConfig, registryConfig, seedConfig],
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 30 }],
    }),
    PrismaModule,
    SeedModule,
    AuthModule,
    BootstrapModule,
    ClaimModule,
    DevicesModule,
    UsersModule,
    PluginsModule,
    RenderModule,
    ScreensModule,
    PluginInstancesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
