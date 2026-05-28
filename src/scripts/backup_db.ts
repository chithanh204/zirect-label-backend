import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting database backup...');
  try {
    const users = await prisma.user.findMany();
    const artists = await prisma.artist.findMany();
    const albums = await prisma.album.findMany();
    const tracks = await prisma.track.findMany();
    const trackPlatforms = await prisma.trackPlatform.findMany();
    const albumCollaborators = await prisma.albumCollaborator.findMany();
    const platformRevenues = await prisma.platformRevenue.findMany();
    const platformPayments = await prisma.platformPayment.findMany();
    const revenueSplits = await prisma.revenueSplit.findMany();
    const analytics = await prisma.analytics.findMany();
    const homePages = await prisma.homePage.findMany();
    const featuredReleases = await prisma.featuredRelease.findMany();
    const contractSubmissions = await prisma.contractSubmission.findMany();
    const paymentLogs = await prisma.paymentLog.findMany();

    const backupData = {
      users,
      artists,
      albums,
      tracks,
      trackPlatforms,
      albumCollaborators,
      platformRevenues,
      platformPayments,
      revenueSplits,
      analytics,
      homePages,
      featuredReleases,
      contractSubmissions,
      paymentLogs,
    };

    const backupPath = path.join(process.cwd(), 'prisma', 'backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`Backup completed successfully. Saved to ${backupPath}`);
    console.log(`Summary of records backed up:
      - Users: ${users.length}
      - Artists: ${artists.length}
      - Albums: ${albums.length}
      - Tracks: ${tracks.length}
      - TrackPlatforms: ${trackPlatforms.length}
      - AlbumCollaborators: ${albumCollaborators.length}
      - PlatformRevenues: ${platformRevenues.length}
      - PlatformPayments: ${platformPayments.length}
      - RevenueSplits: ${revenueSplits.length}
      - Analytics: ${analytics.length}
      - HomePages: ${homePages.length}
      - FeaturedReleases: ${featuredReleases.length}
      - ContractSubmissions: ${contractSubmissions.length}
      - PaymentLogs: ${paymentLogs.length}
    `);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
