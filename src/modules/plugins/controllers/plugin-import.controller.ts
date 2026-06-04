import { UserJwtAuthGuard } from '@modules/auth';
import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { PluginImportService } from '../services/plugin-import.service';

@ApiTags('plugins')
@Controller('plugins')
export class PluginImportController {
  constructor(private readonly pluginImportService: PluginImportService) {}

  @Post('import/zip')
  @UseGuards(UserJwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    })
  )
  @ApiOperation({ summary: 'Import plugin from ZIP file' })
  @ApiBearerAuth('user-jwt')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Plugin imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ZIP file' })
  async importZip(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Missing file');
    }

    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException('Only ZIP files are allowed');
    }

    return this.pluginImportService.importFromZipUpload(file);
  }
}
