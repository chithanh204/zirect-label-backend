export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  type: 'artist' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Artist {
  id: string;
  userId: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  followers: number;
  totalStreams: number;
  totalRevenue: number;
  status: 'active' | 'pending' | 'blocked';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId?: string;
  youtubeId?: string;
  releaseDate: Date;
  coverArt?: string;
  status: 'draft' | 'submitted' | 'approved' | 'distributed' | 'rejected';
  tracks: Track[];
  totalStreams: number;
  revenue: number;
  upc?: string;
  rejectionReason?: string;

  // Album metadata
  displayArtist?: string;
  primaryArtists?: string;
  featuringArtists?: string;
  pYear?: number;
  cYear?: number;
  pLine?: string;
  cLine?: string;
  genre?: string;
  subgenre?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Track {
  id: string;
  title: string;
  duration: number;
  isrc?: string;
  featuring?: string;
  streams: number;
  revenue: number;
  position: number;

  // Track metadata
  composers?: string;
  lyricists?: string;
  language?: string;
  pYear?: number;
  cYear?: number;
  pLine?: string;
  cLine?: string;
  genre?: string;
  subgenre?: string;
  hasExplicitContent?: boolean;
}

export interface Analytics {
  id: string;
  artistId: string;
  albumId?: string;
  date: Date;
  streams: number;
  revenue: number;
  platform: string;
  region: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
