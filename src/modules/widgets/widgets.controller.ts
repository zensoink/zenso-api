import { Controller } from '@nestjs/common';

import { WidgetsService } from './widgets.service';

@Controller('v1/devices')
export class WidgetsController {
  constructor(private readonly widgetService: WidgetsService) {}
}
