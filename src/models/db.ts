// In-memory database for MVP
// In production, replace with Prisma/database

import type { User, Artist, Album, Analytics } from '@schemas/index';

export class Database {
  private users: User[] = [
    {
      id: 'user-admin-1',
      email: 'admin@zirect.com',
      name: 'Admin User',
      password: 'hashed_password_admin',
      type: 'admin',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'user-artist-1',
      email: 'artist1@example.com',
      name: 'The Weeknd',
      password: 'hashed_password_1',
      type: 'artist',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    },
    {
      id: 'user-artist-2',
      email: 'artist2@example.com',
      name: 'Drake',
      password: 'hashed_password_2',
      type: 'artist',
      createdAt: new Date('2024-02-15'),
      updatedAt: new Date('2024-02-15'),
    },
  ];

  private artists: Artist[] = [
    {
      id: 'artist-1',
      userId: 'user-artist-1',
      name: 'The Weeknd',
      email: 'artist1@example.com',
      bio: 'Canadian rapper and singer',
      avatar: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200',
      followers: 45000000,
      totalStreams: 85000000,
      totalRevenue: 250000,
      status: 'active',
      joinedAt: new Date('2024-02-01'),
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    },
    {
      id: 'artist-2',
      userId: 'user-artist-2',
      name: 'Drake',
      email: 'artist2@example.com',
      bio: 'Toronto-based rapper',
      avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
      followers: 67000000,
      totalStreams: 125000000,
      totalRevenue: 450000,
      status: 'active',
      joinedAt: new Date('2024-02-15'),
      createdAt: new Date('2024-02-15'),
      updatedAt: new Date('2024-02-15'),
    },
  ];

  private albums: Album[] = [
    {
      id: 'album-1',
      title: 'Starboy',
      artistId: 'artist-1',
      artistName: 'The Weeknd',
      releaseDate: new Date('2024-01-15'),
      coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
      status: 'distributed',
      tracks: [
        { id: '1', title: 'Starboy', duration: 235, isrc: 'USRC17607839', featuring: 'Daft Punk', streams: 500000000, revenue: 2500000, position: 1 },
        { id: '2', title: 'Party Monster', duration: 240, isrc: 'USRC17607840', streams: 120000000, revenue: 600000, position: 2 },
      ],
      totalStreams: 620000000,
      revenue: 3100000,
      upc: '602557130851',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'album-2',
      title: 'Certified Lover Boy',
      artistId: 'artist-2',
      artistName: 'Drake',
      releaseDate: new Date('2024-03-01'),
      status: 'distributed',
      tracks: [
        { id: '3', title: 'Certified Lover Boy', duration: 235, isrc: 'CARC21607839', streams: 800000000, revenue: 4000000, position: 1 },
      ],
      totalStreams: 800000000,
      revenue: 4000000,
      upc: '602557132222',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-03-01'),
    },
  ];

  private analytics: Analytics[] = [
    {
      id: '1',
      artistId: 'artist-1',
      albumId: 'album-1',
      date: new Date('2024-04-25'),
      streams: 500000,
      revenue: 2500,
      platform: 'Spotify',
      region: 'US',
    },
  ];

  // Users
  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email === email);
  }

  createUser(user: User): User {
    this.users.push(user);
    return user;
  }

  updateUser(id: string, user: Partial<User>): User | undefined {
    const index = this.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...user };
      return this.users[index];
    }
    return undefined;
  }

  // Artists
  getArtists(): Artist[] {
    return this.artists;
  }

  getArtistById(id: string): Artist | undefined {
    return this.artists.find((a) => a.id === id);
  }

  getArtistByUserId(userId: string): Artist | undefined {
    return this.artists.find((a) => a.userId === userId);
  }

  createArtist(artist: Artist): Artist {
    this.artists.push(artist);
    return artist;
  }

  updateArtist(id: string, artist: Partial<Artist>): Artist | undefined {
    const index = this.artists.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.artists[index] = { ...this.artists[index], ...artist };
      return this.artists[index];
    }
    return undefined;
  }

  // Albums
  getAlbums(): Album[] {
    return this.albums;
  }

  getAlbumById(id: string): Album | undefined {
    return this.albums.find((a) => a.id === id);
  }

  getAlbumsByArtistId(artistId: string): Album[] {
    return this.albums.filter((a) => a.artistId === artistId);
  }

  createAlbum(album: Album): Album {
    this.albums.push(album);
    return album;
  }

  updateAlbum(id: string, album: Partial<Album>): Album | undefined {
    const index = this.albums.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.albums[index] = { ...this.albums[index], ...album, updatedAt: new Date() };
      return this.albums[index];
    }
    return undefined;
  }

  // Analytics
  getAnalytics(): Analytics[] {
    return this.analytics;
  }

  getAnalyticsByArtistId(artistId: string): Analytics[] {
    return this.analytics.filter((a) => a.artistId === artistId);
  }

  createAnalytics(analytics: Analytics): Analytics {
    this.analytics.push(analytics);
    return analytics;
  }
}

export const db = new Database();
