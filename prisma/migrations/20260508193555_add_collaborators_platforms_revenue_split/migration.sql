-- CreateTable
CREATE TABLE "track_platforms" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "streams" INTEGER NOT NULL DEFAULT 0,
    "copyrightFlag" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "track_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_collaborators" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'featured',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_splits" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "track_platforms_trackId_platform_key" ON "track_platforms"("trackId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "album_collaborators_albumId_artistId_key" ON "album_collaborators"("albumId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_splits_albumId_artistId_key" ON "revenue_splits"("albumId", "artistId");

-- AddForeignKey
ALTER TABLE "track_platforms" ADD CONSTRAINT "track_platforms_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_collaborators" ADD CONSTRAINT "album_collaborators_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_collaborators" ADD CONSTRAINT "album_collaborators_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_splits" ADD CONSTRAINT "revenue_splits_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_splits" ADD CONSTRAINT "revenue_splits_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
