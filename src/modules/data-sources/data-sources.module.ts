import { Module } from '@nestjs/common';

import { DataSourcesService } from './data-sources.service';
import { IcsSource } from './sources/ics.source';
import { ImageSource } from './sources/image.source';

@Module({
  providers: [DataSourcesService, IcsSource, ImageSource],
  exports: [DataSourcesService, ImageSource],
})
export class DataSourcesModule {}
