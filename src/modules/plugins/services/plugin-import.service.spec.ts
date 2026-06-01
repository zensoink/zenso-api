import { PrismaService } from '@core/prisma';
import { Test, TestingModule } from '@nestjs/testing';

import { PluginImportService } from './plugin-import.service';
import { PluginStorageService } from './plugin-storage.service';
import { PluginValidatorService } from './plugin-validator.service';
import { PluginZipService } from './plugin-zip.service';

describe('PluginImportService', () => {
  let service: PluginImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginImportService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((fn: (tx: object) => unknown) =>
              fn({ plugin: { upsert: jest.fn() }, pluginVersion: { create: jest.fn() } })
            ),
          },
        },
        {
          provide: PluginZipService,
          useValue: { saveUploadToTemp: jest.fn(), saveBufferToTemp: jest.fn(), extractZipToTemp: jest.fn() },
        },
        {
          provide: PluginValidatorService,
          useValue: { validateExtractedPlugin: jest.fn(), toFilesystemSlug: jest.fn() },
        },
        {
          provide: PluginStorageService,
          useValue: {
            ensurePluginDirectories: jest.fn(),
            getVersionPath: jest.fn(),
            moveExtractedPluginToVersionPath: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PluginImportService>(PluginImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
