import axios from 'axios';
import { config } from '../config/config';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';

interface SpotifyTrack {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  releaseDate: string;
  duration: number;
  popularity: number;
  imageUrl?: string;
  previewUrl?: string;
  externalUrl?: string;
}

interface SpotifyArtist {
  id: string;
  name: string;
  followers: number;
  popularity: number;
  genres: string[];
  imageUrl?: string;
  externalUrl?: string;
}

interface SpotifyAudioFeatures {
  trackId: string;
  energy: number;
  danceability: number;
  valence: number;
  tempo: number;
  key: number;
  mode: number;
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  constructor() {
    this.clientId = config.spotify.clientId || '';
    this.clientSecret = config.spotify.clientSecret || '';
  }

  /**
   * Get access token using Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiration) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        SPOTIFY_AUTH_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiration = now + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
      return this.accessToken || '';
    } catch (error) {
      console.error('Spotify authentication error:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, maxResults: number = 5): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
        params: {
          q: query,
          type: 'track',
          limit: maxResults,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.tracks.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        artistName: item.artists[0]?.name || 'Unknown',
        albumName: item.album?.name || '',
        releaseDate: item.album?.release_date || '',
        duration: item.duration_ms,
        popularity: item.popularity,
        imageUrl: item.album?.images[0]?.url,
        previewUrl: item.preview_url,
        externalUrl: item.external_urls?.spotify,
      }));
    } catch (error) {
      console.error('Spotify search tracks error:', error);
      throw new Error('Failed to search Spotify tracks');
    }
  }

  /**
   * Search for artists
   */
  async searchArtists(query: string, maxResults: number = 5): Promise<SpotifyArtist[]> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
        params: {
          q: query,
          type: 'artist',
          limit: maxResults,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.artists.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        followers: item.followers?.total || 0,
        popularity: item.popularity,
        genres: item.genres || [],
        imageUrl: item.images[0]?.url,
        externalUrl: item.external_urls?.spotify,
      }));
    } catch (error) {
      console.error('Spotify search artists error:', error);
      throw new Error('Failed to search Spotify artists');
    }
  }

  /**
   * Get track details
   */
  async getTrack(trackId: string): Promise<SpotifyTrack | null> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${SPOTIFY_API_URL}/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const item = response.data;
      return {
        id: item.id,
        name: item.name,
        artistName: item.artists[0]?.name || 'Unknown',
        albumName: item.album?.name || '',
        releaseDate: item.album?.release_date || '',
        duration: item.duration_ms,
        popularity: item.popularity,
        imageUrl: item.album?.images[0]?.url,
        previewUrl: item.preview_url,
        externalUrl: item.external_urls?.spotify,
      };
    } catch (error) {
      console.error('Spotify get track error:', error);
      return null;
    }
  }

  /**
   * Get multiple tracks details in batches
   */
  async getTracksMultiple(trackIds: string[]): Promise<SpotifyTrack[]> {
    if (trackIds.length === 0) return [];
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${SPOTIFY_API_URL}/tracks`, {
        params: {
          ids: trackIds.join(','),
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.tracks.map((item: any) => {
        if (!item) return null;
        return {
          id: item.id,
          name: item.name,
          artistName: item.artists[0]?.name || 'Unknown',
          albumName: item.album?.name || '',
          releaseDate: item.album?.release_date || '',
          duration: item.duration_ms,
          popularity: item.popularity || 0,
          imageUrl: item.album?.images[0]?.url,
          previewUrl: item.preview_url,
          externalUrl: item.external_urls?.spotify,
        };
      }).filter(Boolean);
    } catch (error) {
      console.error('Spotify get multiple tracks error:', error);
      return [];
    }
  }

  /**
   * Get artist details and stats
   */
  async getArtist(artistId: string): Promise<SpotifyArtist | null> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${SPOTIFY_API_URL}/artists/${artistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const item = response.data;
      return {
        id: item.id,
        name: item.name,
        followers: item.followers?.total || 0,
        popularity: item.popularity,
        genres: item.genres || [],
        imageUrl: item.images[0]?.url,
        externalUrl: item.external_urls?.spotify,
      };
    } catch (error) {
      console.error('Spotify get artist error:', error);
      return null;
    }
  }

  /**
   * Get audio features for a track
   */
  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures | null> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${SPOTIFY_API_URL}/audio-features/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        trackId,
        energy: response.data.energy,
        danceability: response.data.danceability,
        valence: response.data.valence,
        tempo: response.data.tempo,
        key: response.data.key,
        mode: response.data.mode,
      };
    } catch (error) {
      console.error('Spotify get audio features error:', error);
      return null;
    }
  }

  /**
   * Get recommendations based on seed values
   */
  async getRecommendations(seedArtists: string[], seedTracks: string[], limit: number = 10): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${SPOTIFY_API_URL}/recommendations`, {
        params: {
          seed_artists: seedArtists.join(','),
          seed_tracks: seedTracks.join(','),
          limit,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.tracks.map((item: any) => ({
        id: item.id,
        name: item.name,
        artistName: item.artists[0]?.name || 'Unknown',
        albumName: item.album?.name || '',
        releaseDate: item.album?.release_date || '',
        duration: item.duration_ms,
        popularity: item.popularity,
        imageUrl: item.album?.images[0]?.url,
        previewUrl: item.preview_url,
        externalUrl: item.external_urls?.spotify,
      }));
    } catch (error) {
      console.error('Spotify get recommendations error:', error);
      throw new Error('Failed to get Spotify recommendations');
    }
  }

  /**
   * Get album details from Spotify
   */
  async getAlbum(albumId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${SPOTIFY_API_URL}/albums/${albumId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return {
        id: response.data.id,
        name: response.data.name,
        artists: response.data.artists,
        release_date: response.data.release_date,
        total_tracks: response.data.total_tracks,
        genres: response.data.genres,
        images: response.data.images,
        external_urls: response.data.external_urls,
      };
    } catch (error) {
      console.error('Spotify get album error:', error);
      throw new Error('Failed to get album details from Spotify');
    }
  }

  /**
   * Get all tracks from a Spotify album
   */
  async getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();
      const allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 50; // Max items per request

      // Paginate through all tracks
      let hasMore = true;
      while (hasMore) {
        const response = await axios.get(`${SPOTIFY_API_URL}/albums/${albumId}/tracks`, {
          params: {
            limit,
            offset,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const tracks = response.data.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          artistName: item.artists[0]?.name || 'Unknown',
          albumName: '',
          releaseDate: '',
          duration: item.duration_ms,
          popularity: 0, // Tracks in album don't have popularity, only full track objects do
          imageUrl: undefined,
          previewUrl: item.preview_url,
          externalUrl: item.external_urls?.spotify,
        }));

        allTracks.push(...tracks);
        hasMore = response.data.next !== null;
        offset += limit;
      }

      return allTracks;
    } catch (error) {
      console.error('Spotify get album tracks error:', error);
      throw new Error('Failed to get album tracks from Spotify');
    }
  }
}

export const spotifyService = new SpotifyService();
