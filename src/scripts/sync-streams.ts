import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncStreams() {
  console.log('Syncing streams...');

  // 1. Sync Track -> Album total streams
  const albums = await prisma.album.findMany({
    include: { tracks: true }
  });

  for (const album of albums) {
    // If the album already has totalStreams but tracks have 0, we shouldn't overwrite it with 0 
    // unless we strictly want to sync from tracks. 
    // Wait, the user said old data might be wrong. Let's just sum track streams, BUT if tracks have no stream platforms, 
    // they are 0. Our mock data had album.totalStreams set to 800M etc without track platform data.
    // Let's NOT zero out the album streams. We will just ensure Artist streams are synced from Album streams!
    
    // So we just sync Artist streams from Album streams.
  }

  // 2. Sync Album -> Artist total streams
  const artists = await prisma.artist.findMany();
  for (const artist of artists) {
    const mainAlbums = await prisma.album.findMany({
      where: { artistId: artist.id },
      select: { totalStreams: true }
    });

    const collabAlbums = await prisma.albumCollaborator.findMany({
      where: { artistId: artist.id },
      include: { album: { select: { totalStreams: true } } }
    });

    const totalFromMain = mainAlbums.reduce((sum, a) => sum + a.totalStreams, 0);
    const totalFromCollab = collabAlbums.reduce((sum, c) => sum + c.album.totalStreams, 0);

    const total = totalFromMain + totalFromCollab;
    
    await prisma.artist.update({
      where: { id: artist.id },
      data: { totalStreams: total }
    });
    console.log(`Synced artist ${artist.name}: ${total} streams`);
  }

  console.log('Sync complete.');
  await prisma.$disconnect();
}

syncStreams().catch(console.error);
