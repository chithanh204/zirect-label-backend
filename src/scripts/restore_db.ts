import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting database restore...');
  const backupPath = path.join(process.cwd(), 'prisma', 'backup.json');

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at ${backupPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(backupPath, 'utf-8');
  const backup = JSON.parse(rawData);

  try {
    console.log('Cleaning up existing database records in reverse dependency order...');
    
    // Clear new tables
    await prisma.paymentLogDetail.deleteMany({});
    
    // Clear old tables
    await prisma.paymentLog.deleteMany({});
    await prisma.trackPlatform.deleteMany({});
    await prisma.analytics.deleteMany({});
    await prisma.featuredRelease.deleteMany({});
    await prisma.contractSubmission.deleteMany({});
    await prisma.homePage.deleteMany({});
    await prisma.revenueSplit.deleteMany({});
    await prisma.platformPayment.deleteMany({});
    await prisma.platformRevenue.deleteMany({});
    await prisma.albumCollaborator.deleteMany({});
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('Restoring Users...');
    if (backup.users && backup.users.length > 0) {
      await prisma.user.createMany({ data: backup.users });
    }

    console.log('Restoring Artists (initializing balance & totalPaid)...');
    if (backup.artists && backup.artists.length > 0) {
      const mappedArtists = backup.artists.map((artist: any) => ({
        ...artist,
        balance: artist.balance !== undefined ? artist.balance : 0,
        totalPaid: artist.totalPaid !== undefined ? artist.totalPaid : 0,
      }));
      await prisma.artist.createMany({ data: mappedArtists });
    }

    console.log('Restoring Albums...');
    if (backup.albums && backup.albums.length > 0) {
      await prisma.album.createMany({ data: backup.albums });
    }

    console.log('Restoring Tracks...');
    if (backup.tracks && backup.tracks.length > 0) {
      await prisma.track.createMany({ data: backup.tracks });
    }

    console.log('Restoring TrackPlatforms...');
    if (backup.trackPlatforms && backup.trackPlatforms.length > 0) {
      await prisma.trackPlatform.createMany({ data: backup.trackPlatforms });
    }

    console.log('Restoring AlbumCollaborators...');
    if (backup.albumCollaborators && backup.albumCollaborators.length > 0) {
      await prisma.albumCollaborator.createMany({ data: backup.albumCollaborators });
    }

    console.log('Restoring PlatformRevenues...');
    if (backup.platformRevenues && backup.platformRevenues.length > 0) {
      await prisma.platformRevenue.createMany({ data: backup.platformRevenues });
    }

    console.log('Restoring PlatformPayments...');
    if (backup.platformPayments && backup.platformPayments.length > 0) {
      await prisma.platformPayment.createMany({ data: backup.platformPayments });
    }

    console.log('Restoring RevenueSplits...');
    if (backup.revenueSplits && backup.revenueSplits.length > 0) {
      await prisma.revenueSplit.createMany({ data: backup.revenueSplits });
    }

    console.log('Restoring Analytics...');
    if (backup.analytics && backup.analytics.length > 0) {
      // Parse dates back to Date objects
      const mappedAnalytics = backup.analytics.map((item: any) => ({
        ...item,
        date: new Date(item.date),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
      await prisma.analytics.createMany({ data: mappedAnalytics });
    }

    console.log('Restoring HomePages...');
    if (backup.homePages && backup.homePages.length > 0) {
      await prisma.homePage.createMany({ data: backup.homePages });
    }

    console.log('Restoring FeaturedReleases...');
    if (backup.featuredReleases && backup.featuredReleases.length > 0) {
      await prisma.featuredRelease.createMany({ data: backup.featuredReleases });
    }

    console.log('Restoring ContractSubmissions...');
    if (backup.contractSubmissions && backup.contractSubmissions.length > 0) {
      await prisma.contractSubmission.createMany({ data: backup.contractSubmissions });
    }

    console.log('Restoring PaymentLogs...');
    if (backup.paymentLogs && backup.paymentLogs.length > 0) {
      // Note: PaymentLog schema changed, but we had 0 records. If records exist, map them.
      const mappedPaymentLogs = backup.paymentLogs.map((item: any) => ({
        id: item.id,
        artistId: item.artistId,
        amount: item.amount,
        paypalAccount: item.paypalAccount,
        transactionId: item.transactionId || 'LEGACY',
        receiptUrl: item.receiptUrl || null,
        note: item.note || 'Legacy payment log',
        paidAt: new Date(item.paidAt),
      }));
      await prisma.paymentLog.createMany({ data: mappedPaymentLogs });
    }

    console.log('Database restore completed successfully!');
  } catch (error) {
    console.error('Database restore failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
