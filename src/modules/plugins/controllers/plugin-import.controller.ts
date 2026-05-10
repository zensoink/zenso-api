import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PluginImportService } from '../services/plugin-import.service';

@Controller('plugins')
export class PluginImportController {
  constructor(private readonly pluginImportService: PluginImportService) {}

  @Post('import/zip')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    })
  )
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
