import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const user = await prisma.user.create({
    data: { name: 'Demo User', email: 'demo@zenso.local' },
  });

  const plugin = await prisma.plugin.create({
    data: {
      manifestId: 'zenso/hello-world',
      slug: 'zenso-hello-world',
      name: 'Hello World',
      description: 'A simple demo plugin for getting started',
      authorName: 'Zenso',
      sourceType: 'local',
    },
  });

  const pluginVersion = await prisma.pluginVersion.create({
    data: {
      pluginId: plugin.id,
      version: '1.0.0',
      manifestJson: {
        id: 'zenso/hello-world',
        version: '1.0.0',
        name: 'Hello World',
        schema_version: 1,
        core_min: '1.0.0',
        config_schema: { type: 'object', properties: {} },
      },
      executionMode: 'local',
      status: 'installed',
    },
  });

  const device = await prisma.device.create({
    data: {
      name: 'Demo device',
      hardwareId: 'AABBCC112233',
      width: 800,
      height: 480,
      userId: user.id,
    },
  });

  const instance = await prisma.pluginInstance.create({
    data: {
      pluginId: plugin.id,
      pluginVersionId: pluginVersion.id,
      name: 'My Hello World',
      userId: user.id,
      isEnabled: true,
    },
  });

  const screen = await prisma.screen.create({
    data: {
      name: 'Default Screen',
      userId: user.id,
      deviceId: device.id,
      layoutType: 'full',
      isActive: true,
    },
  });

  await prisma.screenSlot.create({
    data: {
      screenId: screen.id,
      pluginInstanceId: instance.id,
      slotKey: 'A',
      x: 0,
      y: 0,
      w: 800,
      h: 480,
      renderOrder: 0,
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
