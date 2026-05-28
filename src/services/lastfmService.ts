import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/config';

const LASTFM_API_URL = 'http://ws.audioscrobbler.com/2.0/';

interface LastFmTrack {
  name: string;
  artist: string;
  playcount: number;
  listeners: number;
  url: string;
  imageUrl?: string;
}

interface LastFmArtist {
  name: string;
  playcount: number;
  listeners: number;
  streamable: boolean;
  onTour: boolean;
  url: string;
  imageUrl?: string;
  bio?: string;
}

interface LastFmUserScrobbles {
  date: string;
  timestamp: number;
  trackName: string;
  artistName: string;
  albumName: string;
}

export class LastFmService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = config.lastfm.apiKey;
    this.apiSecret = config.lastfm.secret;
  }

  /**
   * Get track info and scrobble count
   */
  async getTrack(artist: string, track: string): Promise<LastFmTrack | null> {
    try {
      const response = await axios.get(LASTFM_API_URL, {
        params: {
          method: 'track.getInfo',
          artist,
          track,
          api_key: this.apiKey,
          format: 'json',
        },
      });

      const trackData = response.data.track;
      return {
        name: trackData.name,
        artist: trackData.artist.name,
        playcount: parseInt(trackData.playcount || '0'),
        listeners: parseInt(trackData.listeners || '0'),
        url: trackData.url,
        imageUrl: trackData.image?.[trackData.image.length - 1]?.['#text'],
      };
    } catch (error) {
      console.error('Last.fm get track error:', error);
      return null;
    }
  }

  /**
   * Get artist info including stats
   */
  async getArtist(artistName: string): Promise<LastFmArtist | null> {
    try {
      const response = await axios.get(LASTFM_API_URL, {
        params: {
          method: 'artist.getInfo',
          artist: artistName,
          api_key: this.apiKey,
          format: 'json',
        },
      });

      const artistData = response.data.artist;
      return {
        name: artistData.name,
        playcount: parseInt(artistData.stats?.playcount || '0'),
        listeners: parseInt(artistData.stats?.listeners || '0'),
        streamable: artistData.streamable === '1',
        onTour: artistData.ontour === '1',
        url: artistData.url,
        imageUrl: artistData.image?.[artistData.image.length - 1]?.['#text'],
        bio: artistData.bio?.summary?.replace(/<[^>]*>/g, ''),
      };
    } catch (error) {
      console.error('Last.fm get artist error:', error);
      return null;
    }
  }

  /**
   * Search for artists
   */
  async searchArtist(query: string, maxResults: number = 5): Promise<LastFmArtist[]> {
    try {
      const response = await axios.get(LASTFM_API_URL, {
        params: {
          method: 'artist.search',
          artist: query,
          api_key: this.apiKey,
          limit: maxResults,
          format: 'json',
        },
      });

      return (response.data.results?.artistmatches?.artist || []).map((item: any) => ({
        name: item.name,
        playcount: parseInt(item.playcount || '0'),
        listeners: parseInt(item.listeners || '0'),
        streamable: item.streamable === '1',
        onTour: false,
        url: item.url,
        imageUrl: item.image?.[item.image.length - 1]?.['#text'],
      }));
    } catch (error) {
      console.error('Last.fm search artist error:', error);
      throw new Error('Failed to search Last.fm artists');
    }
  }

  /**
   * Search for tracks
   */
  async searchTrack(track: string, artist?: string, maxResults: number = 5): Promise<LastFmTrack[]> {
    try {
      let query = track;
      if (artist) {
        query = `${artist} ${track}`;
      }

      const response = await axios.get(LASTFM_API_URL, {
        params: {
          method: 'track.search',
          track: query,
          api_key: this.apiKey,
          limit: maxResults,
          format: 'json',
        },
      });

      return (response.data.results?.trackmatches?.track || []).map((item: any) => ({
        name: item.name,
        artist: item.artist,
        playcount: parseInt(item.playcount || '0'),
        listeners: parseInt(item.listeners || '0'),
        url: item.url,
        imageUrl: item.image?.[item.image.length - 1]?.['#text'],
      }));
    } catch (error) {
      console.error('Last.fm search track error:', error);
      throw new Error('Failed to search Last.fm tracks');
    }
  }

  /**
   * Get artist top tracks
   */
  async getArtistTopTracks(artistName: string, maxResults: number = 10): Promise<LastFmTrack[]> {
    try {
      const response = await axios.get(LASTFM_API_URL, {
        params: {
          method: 'artist.getTopTracks',
          artist: artistName,
          api_key: this.apiKey,
          limit: maxResults,
          format: 'json',
        },
      });

      return (response.data.toptracks?.track || []).map((item: any) => ({
        name: item.name,
        artist: item.artist.name,
        playcount: parseInt(item.playcount || '0'),
        listeners: parseInt(item.listeners || '0'),
        url: item.url,
        imageUrl: item.image?.[item.image.length - 1]?.['#text'],
      }));
    } catch (error) {
      console.error('Last.fm get top tracks error:', error);
      throw new Error('Failed to get Last.fm artist top tracks');
    }
  }

  /**
   * Get similar artists
   */
  async getSimilarArtists(artistName: string, maxResults: number = 10): Promise<LastFmArtist[]> {
    try {
      const response = await axios.get(LASTFM_API_URL, {
        params: {
          method: 'artist.getSimilar',
          artist: artistName,
          api_key: this.apiKey,
          limit: maxResults,
          format: 'json',
        },
      });

      return (response.data.similarartists?.artist || []).map((item: any) => ({
        name: item.name,
        playcount: 0,
        listeners: parseInt(item.listeners || '0'),
        streamable: item.streamable === '1',
        onTour: false,
        url: item.url,
        imageUrl: item.image?.[item.image.length - 1]?.['#text'],
      }));
    } catch (error) {
      console.error('Last.fm get similar artists error:', error);
      throw new Error('Failed to get Last.fm similar artists');
    }
  }

  /**
   * Get weekly artist chart (top artists for period)
   */
  async getWeeklyArtistChart(maxResults: number = 10): Promise<LastFmArtist[]> {
    try {
      const response = await axios.get(LASTFM_API_URL, {
        params: {
          method: 'chart.getTopArtists',
          api_key: this.apiKey,
          limit: maxResults,
          format: 'json',
        },
      });

      return (response.data.artists?.artist || []).map((item: any) => ({
        name: item.name,
        playcount: parseInt(item.playcount || '0'),
        listeners: parseInt(item.listeners || '0'),
        streamable: false,
        onTour: false,
        url: item.url,
        imageUrl: item.image?.[item.image.length - 1]?.['#text'],
      }));
    } catch (error) {
      console.error('Last.fm get weekly chart error:', error);
      throw new Error('Failed to get Last.fm weekly chart');
    }
  }

  /**
   * Generate signature for authenticated requests
   */
  private generateSignature(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');

    return crypto.createMd5(sortedParams + this.apiSecret).digest('hex');
  }
}

export const lastfmService = new LastFmService();
