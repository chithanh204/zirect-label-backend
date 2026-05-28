-- AddColumn Album metadata fields
ALTER TABLE "albums" ADD COLUMN "catalogueNo" TEXT;
ALTER TABLE "albums" ADD COLUMN "displayArtist" TEXT;
ALTER TABLE "albums" ADD COLUMN "primaryArtists" TEXT;
ALTER TABLE "albums" ADD COLUMN "featuringArtists" TEXT;
ALTER TABLE "albums" ADD COLUMN "pYear" INTEGER;
ALTER TABLE "albums" ADD COLUMN "cYear" INTEGER;
ALTER TABLE "albums" ADD COLUMN "pLine" TEXT;
ALTER TABLE "albums" ADD COLUMN "cLine" TEXT;
ALTER TABLE "albums" ADD COLUMN "genre" TEXT;
ALTER TABLE "albums" ADD COLUMN "subgenre" TEXT;

-- AddColumn Track metadata fields
ALTER TABLE "tracks" ADD COLUMN "composers" TEXT;
ALTER TABLE "tracks" ADD COLUMN "lyricists" TEXT;
ALTER TABLE "tracks" ADD COLUMN "language" TEXT;
ALTER TABLE "tracks" ADD COLUMN "pYear" INTEGER;
ALTER TABLE "tracks" ADD COLUMN "cYear" INTEGER;
ALTER TABLE "tracks" ADD COLUMN "pLine" TEXT;
ALTER TABLE "tracks" ADD COLUMN "cLine" TEXT;
ALTER TABLE "tracks" ADD COLUMN "genre" TEXT;
ALTER TABLE "tracks" ADD COLUMN "subgenre" TEXT;
ALTER TABLE "tracks" ADD COLUMN "hasExplicitContent" BOOLEAN NOT NULL DEFAULT false;
