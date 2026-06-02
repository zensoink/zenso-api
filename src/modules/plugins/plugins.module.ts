import { AuthModule } from '@modules/auth';
import { Module } from '@nestjs/common';

import {
  PluginAssetsController,
  PluginImportController,
  PluginsController,
  PluginsDebugController,
} from './controllers';
import { MockRegistryClient } from './services/mock-registry-client.service';
import { PluginImportService } from './services/plugin-import.service';
import { PluginStorageService } from './services/plugin-storage.service';
import { PluginValidatorService } from './services/plugin-validator.service';
import { PluginZipService } from './services/plugin-zip.service';
import { PluginsService } from './services/plugins.service';
import { RegistryClient } from './services/registry-client.service';

@Module({
  imports: [AuthModule],
  providers: [
    PluginsService,
    PluginStorageService,
    PluginImportService,
    PluginValidatorService,
    PluginZipService,
    {
      provide: RegistryClient,
      useClass: process.env.MOCK_REGISTRY === 'true' ? MockRegistryClient : RegistryClient,
    },
  ],
  controllers: [PluginsController, PluginsDebugController, PluginImportController, PluginAssetsController],
  exports: [PluginStorageService, RegistryClient, PluginImportService],
})
export class PluginsModule {}
