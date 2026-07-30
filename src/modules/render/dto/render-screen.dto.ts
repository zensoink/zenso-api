import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenderScreenDTO {
  @ApiPropertyOptional({
    description: 'Template rendering context variables',
    example: { temperature: 22.5, humidity: 60 },
  })
  context?: Record<string, unknown>;
}
