import { spotifyService } from './spotifyService';
import { youtubeService } from './youtubeService';
import { lastfmService } from './lastfmService';

export interface PlatformTrack {
  platform: 'spotify' | 'youtube' | 'lastfm';
  id: string;
  name: string;
  artist: string;
  album?: string;
  duration?: number;
  popularity?: number;
  imageUrl?: string;
  url?: string;
  playcount?: number;
  listeners?: number;
}

export interface PlatformArtist {
  platform: 'spotify' | 'youtube' | 'lastfm';
  id: string;
  name: string;
  followers?: number;
  listeners?: number;
  subscriberCount?: number;
  popularity?: number;
  genres?: string[];
  imageUrl?: string;
  url?: string;
  bio?: string;
}

/**
 * Service for searching and importing track/artist data from multiple platforms
 */
export class PlatformSearchService {
  /**
   * Search for tracks across all platforms
   */
  async searchTracksMultiPlatform(
    query: string,
    maxResults: number = 5
  ): Promise<{ spotify: PlatformTrack[]; youtube: PlatformTrack[]; lastfm: PlatformTrack[] }> {
    const results = {
      spotify: [] as PlatformTrack[],
      youtube: [] as PlatformTrack[],
      lastfm: [] as PlatformTrack[],
    };

    try {
      // Search Spotify
      const spotifyTracks = await spotifyService.searchTracks(query, maxResults);
      results.spotify = spotifyTracks.map(t => ({
        platform: 'spotify' as const,
        id: t.id,
        name: t.name,
        artist: t.artistName,
        album: t.albumName,
        duration: t.duration,
        popularity: t.popularity,
        imageUrl: t.imageUrl,
        url: t.externalUrl,
      }));
    } catch (error) {
      console.error('Spotify search failed:', error);
    }

    try {
      // Search YouTube
      const youtubeVideos = await youtubeService.searchTracks(query, maxResults);
      results.youtube = youtubeVideos.map(v => ({
        platform: 'youtube' as const,
        id: v.videoId,
        name: v.title,
        artist: v.channelTitle,
        imageUrl: v.thumbnailUrl,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
      }));
    } catch (error) {
      console.error('YouTube search failed:', error);
    }

    try {
      // Search Last.fm
      const lastfmTracks = await lastfmService.searchTrack(query, undefined, maxResults);
      results.lastfm = lastfmTracks.map(t => ({
        platform: 'lastfm' as const,
        id: `${t.artist}-${t.name}`,
        name: t.name,
        artist: t.artist,
        playcount: t.playcount,
        listeners: t.listeners,
        imageUrl: t.imageUrl,
        url: t.url,
      }));
    } catch (error) {
      console.error('Last.fm search failed:', error);
    }

    return results;
  }

  /**
   * Search for artists across all platforms
   */
  async searchArtistsMultiPlatform(
    query: string,
    maxResults: number = 5
  ): Promise<{ spotify: PlatformArtist[]; youtube: PlatformArtist[]; lastfm: PlatformArtist[] }> {
    const results = {
      spotify: [] as PlatformArtist[],
      youtube: [] as PlatformArtist[],
      lastfm: [] as PlatformArtist[],
    };

    try {
      // Search Spotify
      const spotifyArtists = await spotifyService.searchArtists(query, maxResults);
      results.spotify = spotifyArtists.map(a => ({
        platform: 'spotify' as const,
        id: a.id,
        name: a.name,
        followers: a.followers,
        popularity: a.popularity,
        genres: a.genres,
        imageUrl: a.imageUrl,
        url: a.externalUrl,
      }));
    } catch (error) {
      console.error('Spotify search failed:', error);
    }

    try {
      // Search YouTube
      const youtubeChannel = await youtubeService.searchChannel(query);
      if (youtubeChannel) {
        const stats = await youtubeService.getChannelStats(youtubeChannel.channelId);
        results.youtube.push({
          platform: 'youtube' as const,
          id: youtubeChannel.channelId,
          name: youtubeChannel.title,
          subscriberCount: stats?.subscriberCount,
          imageUrl: youtubeChannel.thumbnailUrl,
          bio: youtubeChannel.description,
          url: `https://www.youtube.com/channel/${youtubeChannel.channelId}`,
        });
      }
    } catch (error) {
      console.error('YouTube search failed:', error);
    }

    try {
      // Search Last.fm
      const lastfmArtists = await lastfmService.searchArtist(query, maxResults);
      results.lastfm = lastfmArtists.map(a => ({
        platform: 'lastfm' as const,
        id: a.name,
        name: a.name,
        listeners: a.listeners,
        imageUrl: a.imageUrl,
        bio: a.bio,
        url: a.url,
      }));
    } catch (error) {
      console.error('Last.fm search failed:', error);
    }

    return results;
  }

  /**
   * Get top tracks for an artist across platforms
   */
  async getArtistTopTracks(artistName: string, limit: number = 10): Promise<PlatformTrack[]> {
    const results: PlatformTrack[] = [];

    try {
      const lastfmTracks = await lastfmService.getArtistTopTracks(artistName, limit);
      lastfmTracks.forEach(t => {
        results.push({
          platform: 'lastfm',
          id: `${t.artist}-${t.name}`,
          name: t.name,
          artist: t.artist,
          playcount: t.playcount,
          listeners: t.listeners,
          imageUrl: t.imageUrl,
          url: t.url,
        });
      });
    } catch (error) {
      console.error('Last.fm top tracks failed:', error);
    }

    return results;
  }

  /**
   * Get recommendations similar to a track
   */
  async getSimilarTracks(
    artistName: string,
    trackName: string,
    limit: number = 10
  ): Promise<PlatformTrack[]> {
    try {
      const recommendations = await spotifyService.getRecommendations([], [], limit);
      return recommendations.map(t => ({
        platform: 'spotify' as const,
        id: t.id,
        name: t.name,
        artist: t.artistName,
        album: t.albumName,
        popularity: t.popularity,
        imageUrl: t.imageUrl,
        url: t.externalUrl,
      }));
    } catch (error) {
      console.error('Get recommendations failed:', error);
      return [];
    }
  }

  /**
   * Get similar artists
   */
  async getSimilarArtists(artistName: string, limit: number = 10): Promise<PlatformArtist[]> {
    const results: PlatformArtist[] = [];

    try {
      const similarArtists = await lastfmService.getSimilarArtists(artistName, limit);
      similarArtists.forEach(a => {
        results.push({
          platform: 'lastfm',
          id: a.name,
          name: a.name,
          listeners: a.listeners,
          imageUrl: a.imageUrl,
          url: a.url,
        });
      });
    } catch (error) {
      console.error('Last.fm similar artists failed:', error);
    }

    return results;
  }

  /**
   * Get detailed track info from all platforms
   */
  async getTrackDetails(artistName: string, trackName: string): Promise<Record<string, any>> {
    const details: Record<string, any> = {
      spotify: null,
      youtube: null,
      lastfm: null,
    };

    try {
      const spotifyTracks = await spotifyService.searchTracks(`${artistName} ${trackName}`, 1);
      if (spotifyTracks.length > 0) {
        const track = spotifyTracks[0];
        const audioFeatures = await spotifyService.getAudioFeatures(track.id);
        details.spotify = {
          ...track,
          audioFeatures,
        };
      }
    } catch (error) {
      console.error('Spotify track details failed:', error);
    }

    try {
      const youtubeVideos = await youtubeService.searchTracks(`${artistName} ${trackName}`, 1);
      if (youtubeVideos.length > 0) {
        const video = youtubeVideos[0];
        const stats = await youtubeService.getVideoStats(video.videoId);
        details.youtube = {
          ...video,
          ...stats,
        };
      }
    } catch (error) {
      console.error('YouTube track details failed:', error);
    }

    try {
      const lastfmTrack = await lastfmService.getTrack(artistName, trackName);
      details.lastfm = lastfmTrack;
    } catch (error) {
      console.error('Last.fm track details failed:', error);
    }

    return details;
  }

  /**
   * Get detailed artist info from all platforms
   */
  async getArtistDetails(artistName: string): Promise<Record<string, any>> {
    const details: Record<string, any> = {
      spotify: null,
      youtube: null,
      lastfm: null,
    };

    try {
      const spotifyArtists = await spotifyService.searchArtists(artistName, 1);
      if (spotifyArtists.length > 0) {
        details.spotify = spotifyArtists[0];
      }
    } catch (error) {
      console.error('Spotify artist details failed:', error);
    }

    try {
      const youtubeChannel = await youtubeService.searchChannel(artistName);
      if (youtubeChannel) {
        const stats = await youtubeService.getChannelStats(youtubeChannel.channelId);
        details.youtube = {
          ...youtubeChannel,
          stats,
        };
      }
    } catch (error) {
      console.error('YouTube artist details failed:', error);
    }

    try {
      const lastfmArtist = await lastfmService.getArtist(artistName);
      details.lastfm = lastfmArtist;
    } catch (error) {
      console.error('Last.fm artist details failed:', error);
    }

    return details;
  }
}

export const platformSearchService = new PlatformSearchService();
