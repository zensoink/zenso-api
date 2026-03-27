import { PrismaModule } from '@core/prisma';
import { DevicesModule } from '@modules/devices/devices.module';
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
      envFilePath: '.env',
    }),
    PrismaModule,
    DevicesModule,
    UsersModule,
    WidgetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
