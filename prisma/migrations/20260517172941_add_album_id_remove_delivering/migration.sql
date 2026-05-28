/*
  Warnings:

  - The values [delivering] on the enum `AlbumStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unverified', 'pending', 'verified');

-- AlterEnum
BEGIN;
CREATE TYPE "AlbumStatus_new" AS ENUM ('draft', 'submitted', 'approved', 'distributed', 'rejected');
ALTER TABLE "albums" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "albums" ALTER COLUMN "status" TYPE "AlbumStatus_new" USING ("status"::text::"AlbumStatus_new");
ALTER TYPE "AlbumStatus" RENAME TO "AlbumStatus_old";
ALTER TYPE "AlbumStatus_new" RENAME TO "AlbumStatus";
DROP TYPE "AlbumStatus_old";
ALTER TABLE "albums" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "albumId" TEXT;

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentVerificationStatus" "PaymentStatus" NOT NULL DEFAULT 'unverified',
ADD COLUMN     "website" TEXT;
