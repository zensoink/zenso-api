-- ============================================================================
-- Add ON DELETE CASCADE to the three relations that own child rows, so deleting
-- a Screen / PluginInstance / Plugin cascades to its children instead of
-- throwing P2003 (Foreign key constraint violated).
--
-- This is the same failure mode as the earlier ScreenSlot_screenId_fkey errors:
-- `screen.delete()` failed because the screen still had ScreenSlots.
--
-- Existing FKs (from 20260514184604_add_screen_models) are ON DELETE RESTRICT;
-- we drop and recreate them with CASCADE. Guarded with IF EXISTS so the file is
-- safe to (re)apply.
-- ============================================================================

-- 1) ScreenSlot.screen -> Screen
ALTER TABLE "ScreenSlot" DROP CONSTRAINT IF EXISTS "ScreenSlot_screenId_fkey";
ALTER TABLE "ScreenSlot" ADD CONSTRAINT "ScreenSlot_screenId_fkey"
  FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE CASCADE;

-- 2) ScreenSlot.pluginInstance -> PluginInstance
ALTER TABLE "ScreenSlot" DROP CONSTRAINT IF EXISTS "ScreenSlot_pluginInstanceId_fkey";
ALTER TABLE "ScreenSlot" ADD CONSTRAINT "ScreenSlot_pluginInstanceId_fkey"
  FOREIGN KEY ("pluginInstanceId") REFERENCES "PluginInstance"("id") ON DELETE CASCADE;

-- 3) PluginInstance.plugin -> Plugin
ALTER TABLE "PluginInstance" DROP CONSTRAINT IF EXISTS "PluginInstance_pluginId_fkey";
ALTER TABLE "PluginInstance" ADD CONSTRAINT "PluginInstance_pluginId_fkey"
  FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE;
