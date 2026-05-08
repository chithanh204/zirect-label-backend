-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('artist', 'admin');

-- CreateEnum
CREATE TYPE "ArtistStatus" AS ENUM ('active', 'pending', 'blocked');

-- CreateEnum
CREATE TYPE "AlbumStatus" AS ENUM ('draft', 'submitted', 'approved', 'delivering', 'distributed', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" "UserType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "totalStreams" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ArtistStatus" NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "coverArt" TEXT,
    "status" "AlbumStatus" NOT NULL DEFAULT 'draft',
    "totalStreams" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upc" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "isrc" TEXT,
    "featuring" TEXT,
    "streams" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "streams" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platform" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "artists_userId_key" ON "artists"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "artists_email_key" ON "artists"("email");

-- CreateIndex
CREATE INDEX "analytics_artistId_idx" ON "analytics"("artistId");

-- CreateIndex
CREATE INDEX "analytics_albumId_idx" ON "analytics"("albumId");

-- CreateIndex
CREATE INDEX "analytics_date_idx" ON "analytics"("date");

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
