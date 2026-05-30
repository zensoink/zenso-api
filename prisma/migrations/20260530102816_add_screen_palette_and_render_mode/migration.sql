-- AlterTable
ALTER TABLE "Screen" ADD COLUMN     "palette" TEXT[] DEFAULT ARRAY['#000000', '#ffffff', '#00ff00', '#0000ff', '#ff0000', '#ffff00', '#ff8000']::TEXT[],
ADD COLUMN     "renderMode" TEXT NOT NULL DEFAULT 'ui';
