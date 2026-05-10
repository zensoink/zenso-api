import { Module } from '@nestjs/common';

import { PluginImportController, PluginsController, PluginsDebugController } from './controllers';
import { PluginAuditService } from './services/plugin-audit.service';
import { PluginImportService } from './services/plugin-import.service';
import { PluginStorageService } from './services/plugin-storage.service';
import { PluginValidatorService } from './services/plugin-validator.service';
import { PluginZipService } from './services/plugin-zip.service';
import { PluginsService } from './services/plugins.service';

@Module({
  providers: [
    PluginsService,
    PluginStorageService,
    PluginImportService,
    PluginValidatorService,
    PluginAuditService,
    PluginZipService,
  ],
  controllers: [PluginsController, PluginsDebugController, PluginImportController],
  exports: [PluginStorageService],
})
export class PluginsModule {}
