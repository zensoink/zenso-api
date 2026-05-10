import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';

@Injectable()
export class PluginZipService {
  private getTempRoot(): string {
    return path.join(os.tmpdir(), 'zenso', 'plugins');
  }

  async saveUploadToTemp(file: Express.Multer.File): Promise<string> {
    const dir = path.join(this.getTempRoot(), 'uploads');
    await fs.mkdir(dir, { recursive: true });

    const zipPath = path.join(dir, `${randomUUID()}.zip`);
    await fs.writeFile(zipPath, file.buffer);

    return zipPath;
  }

  async extractZipToTemp(zipPath: string): Promise<string> {
    const extractDir = path.join(this.getTempRoot(), 'extracted', randomUUID());
    await fs.mkdir(extractDir, { recursive: true });

    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    for (const entry of entries) {
      const destPath = path.resolve(extractDir, entry.entryName);

      const relative = path.relative(extractDir, destPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new BadRequestException(`Unsafe ZIP entry: ${entry.entryName}`);
      }
    }

    zip.extractAllTo(extractDir, true);

    return extractDir;
  }
}
