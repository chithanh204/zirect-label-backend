-- AlterTable: Remove position and duration; add mixTitle, primaryArtists, remixingArtists
ALTER TABLE "tracks" DROP COLUMN IF EXISTS "position";
ALTER TABLE "tracks" DROP COLUMN IF EXISTS "duration";
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "mixTitle" TEXT;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "primaryArtists" TEXT;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "remixingArtists" TEXT;
