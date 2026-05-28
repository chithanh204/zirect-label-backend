-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "composerName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paypalAccount" TEXT;

-- CreateTable
CREATE TABLE "homepage_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "logoUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_releases" (
    "id" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "artistNames" TEXT NOT NULL,
    "spotifyLink" TEXT,
    "youtubeLink" TEXT,
    "coverArt" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_submissions" (
    "id" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "demoLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_logs" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paypalAccount" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
