import { authConfig, pluginsConfig, registryConfig, seedConfig } from '@core/config';
import { PrismaModule } from '@core/prisma';
import { SeedModule } from '@core/seed';
import { AuthModule } from '@modules/auth';
import { DevicesModule } from '@modules/devices';
import { PluginInstancesModule } from '@modules/plugin-instances';
import { PluginsModule } from '@modules/plugins';
import { RenderModule } from '@modules/render';
import { ScreensModule } from '@modules/screens';
import { UsersModule } from '@modules/users';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, pluginsConfig, registryConfig, seedConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    SeedModule,
    AuthModule,
    DevicesModule,
    UsersModule,
    PluginsModule,
    RenderModule,
    ScreensModule,
    PluginInstancesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
