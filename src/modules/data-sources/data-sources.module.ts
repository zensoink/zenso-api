import { Module } from '@nestjs/common';

import { DataSourcesService } from './data-sources.service';
import { IcsSource } from './sources/ics.source';

@Module({
  providers: [DataSourcesService, IcsSource],
  exports: [DataSourcesService],
})
export class DataSourcesModule {}
