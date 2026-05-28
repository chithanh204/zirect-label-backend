import { PrismaClient, UserType, ArtistStatus, AlbumStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.analytics.deleteMany();
  await prisma.track.deleteMany();
  await prisma.album.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('👤 Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const artistPassword = await bcrypt.hash('artist123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@zirect.com',
      name: 'Admin User',
      password: adminPassword,
      type: UserType.admin,
    },
  });

  const artist1User = await prisma.user.create({
    data: {
      email: 'artist1@example.com',
      name: 'The Weeknd',
      password: artistPassword,
      type: UserType.artist,
    },
  });

  const artist2User = await prisma.user.create({
    data: {
      email: 'artist2@example.com',
      name: 'Drake',
      password: artistPassword,
      type: UserType.artist,
    },
  });

  console.log('✅ Created 3 users\n');

  // Create artists
  console.log('🎤 Creating artists...');
  const artist1 = await prisma.artist.create({
    data: {
      userId: artist1User.id,
      name: 'The Weeknd',
      email: 'artist1@example.com',
      bio: 'Canadian rapper and singer',
      avatar: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200',
      followers: 45000000,
      totalStreams: 85000000,
      totalRevenue: 250000,
      status: ArtistStatus.active,
    },
  });

  const artist2 = await prisma.artist.create({
    data: {
      userId: artist2User.id,
      name: 'Drake',
      email: 'artist2@example.com',
      bio: 'Toronto-based rapper',
      avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
      followers: 67000000,
      totalStreams: 125000000,
      totalRevenue: 450000,
      status: ArtistStatus.active,
    },
  });

  console.log('✅ Created 2 artists\n');

  // Create albums with tracks
  console.log('💿 Creating albums with tracks...');
  const album1 = await prisma.album.create({
    data: {
      title: 'Starboy',
      artistId: artist1.id,
      artistName: 'The Weeknd',
      releaseDate: new Date('2024-01-15'),
      coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
      status: AlbumStatus.distributed,
      totalStreams: 620000000,
      revenue: 3100000,
      upc: '602557130851',
      tracks: {
        create: [
          {
            title: 'Starboy',
            streams: 200000000,
            revenue: 1000000,
          },
          {
            title: 'Party Monster',
            streams: 150000000,
            revenue: 750000,
          },
          {
            title: 'False Alarm',
            streams: 120000000,
            revenue: 600000,
          },
          {
            title: 'Reminder',
            streams: 150000000,
            revenue: 750000,
          },
        ],
      },
    },
    include: { tracks: true },
  });

  const album2 = await prisma.album.create({
    data: {
      title: 'Certified Lover Boy',
      artistId: artist2.id,
      artistName: 'Drake',
      releaseDate: new Date('2024-03-01'),
      coverArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
      status: AlbumStatus.distributed,
      totalStreams: 800000000,
      revenue: 4000000,
      upc: '602557132222',
      tracks: {
        create: [
          {
            title: 'Certified Lover Boy',
            streams: 300000000,
            revenue: 1500000,
          },
          {
            title: 'Enough Tonight',
            streams: 250000000,
            revenue: 1250000,
          },
          {
            title: 'Way 2 Sexy',
            streams: 250000000,
            revenue: 1250000,
          },
        ],
      },
    },
    include: { tracks: true },
  });

  console.log('✅ Created 2 albums with 7 tracks total\n');

  // Create analytics
  console.log('📊 Creating analytics data...');
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Artist 1 analytics
    await prisma.analytics.create({
      data: {
        artistId: artist1.id,
        albumId: album1.id,
        date,
        streams: Math.floor(Math.random() * 500000 + 100000),
        revenue: Math.random() * 5000 + 1000,
        platform: ['spotify', 'youtube_music'][i % 2],
        region: ['US', 'UK', 'DE', 'FR', 'BR'][i % 5],
      },
    });

    // Artist 2 analytics
    await prisma.analytics.create({
      data: {
        artistId: artist2.id,
        albumId: album2.id,
        date,
        streams: Math.floor(Math.random() * 600000 + 150000),
        revenue: Math.random() * 6000 + 1500,
        platform: ['spotify', 'youtube_music'][i % 2],
        region: ['US', 'UK', 'DE', 'FR', 'BR'][i % 5],
      },
    });
  }

  console.log('✅ Created 60 analytics records (30 days × 2 artists)\n');

  // Create default homepage config
  console.log('🏠 Seeding HomePage configuration...');
  await prisma.homePage.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      logoUrl: '',
      title: 'Zirect Label',
      description: 'Your premier music distribution partner'
    }
  });

  // Create some default featured releases
  console.log('💿 Seeding Featured Releases...');
  const sampleReleases = [
    {
      trackName: 'Starboy',
      artistNames: 'The Weeknd',
      spotifyLink: 'https://open.spotify.com/track/7MXVkk9YM1w2v4NVqqyCsg',
      youtubeLink: 'https://music.youtube.com/watch?v=34Na4j8AVgA',
      coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
      order: 1
    },
    {
      trackName: 'Certified Lover Boy',
      artistNames: 'Drake',
      spotifyLink: 'https://open.spotify.com/track/3ee8J12t6ZgHgZlh7v1v2a',
      youtubeLink: 'https://music.youtube.com/watch?v=T82z7NnU2E4',
      coverArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
      order: 2
    }
  ];

  for (const release of sampleReleases) {
    await prisma.featuredRelease.create({ data: release });
  }

  console.log('================================');
  console.log('✨ Database seeded successfully!');
  console.log('================================\n');

  console.log('📝 Test Credentials:');
  console.log('  Admin:    admin@zirect.com / admin123');
  console.log('  Artist 1: artist1@example.com / artist123');
  console.log('  Artist 2: artist2@example.com / artist123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
