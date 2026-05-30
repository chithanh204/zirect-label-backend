import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncStreams() {
  console.log('Syncing streams...');

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
