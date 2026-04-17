-- Add beat timestamps and waveform data to songs
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "beat_timestamps" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "waveform_data" TEXT;
