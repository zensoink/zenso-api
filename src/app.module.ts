import pluginsConfig from '@core/config/plugins.config';
import registryConfig from '@core/config/registry.config';
import { PrismaModule } from '@core/prisma';
import { DevicesModule } from '@modules/devices/devices.module';
import { PluginsModule } from '@modules/plugins';
import { UsersModule } from '@modules/users';
import { WidgetsModule } from '@modules/widgets';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [pluginsConfig, registryConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    DevicesModule,
    UsersModule,
    WidgetsModule,
    PluginsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
