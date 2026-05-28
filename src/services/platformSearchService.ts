import { spotifyService } from './spotifyService';
import { youtubeService } from './youtubeService';

export interface PlatformTrack {
  platform: 'spotify' | 'youtube';
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
  platform: 'spotify' | 'youtube';
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
  ): Promise<{ spotify: PlatformTrack[]; youtube: PlatformTrack[] }> {
    const results = {
      spotify: [] as PlatformTrack[],
      youtube: [] as PlatformTrack[],
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

    return results;
  }

  /**
   * Search for artists across all platforms
   */
  async searchArtistsMultiPlatform(
    query: string,
    maxResults: number = 5
  ): Promise<{ spotify: PlatformArtist[]; youtube: PlatformArtist[] }> {
    const results = {
      spotify: [] as PlatformArtist[],
      youtube: [] as PlatformArtist[],
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
   * Get detailed track info from all platforms
   */
  async getTrackDetails(artistName: string, trackName: string): Promise<Record<string, any>> {
    const details: Record<string, any> = {
      spotify: null,
      youtube: null,
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

    return details;
  }

  /**
   * Get detailed artist info from all platforms
   */
  async getArtistDetails(artistName: string): Promise<Record<string, any>> {
    const details: Record<string, any> = {
      spotify: null,
      youtube: null,
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

    return details;
  }
}

export const platformSearchService = new PlatformSearchService();
