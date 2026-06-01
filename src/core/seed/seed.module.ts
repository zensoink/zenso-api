import { PluginsModule } from '@modules/plugins';
import { Module } from '@nestjs/common';

import { SeedService } from './seed.service';

@Module({
  imports: [PluginsModule],
  providers: [SeedService],
})
export class SeedModule {}
