import { db } from '../models/prisma';
import { youtubeService } from './youtubeService';
import { spotifyService } from './spotifyService';
import { lastfmService } from './lastfmService';

interface SyncResult {
  success: boolean;
  platform: string;
  artistId: string;
  albumId?: string;
  message: string;
  dataCount: number;
}

export class AnalyticsSyncService {
  /**
   * Sync analytics for an artist across all platforms
   */
  async syncArtistAnalytics(artistId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    try {
      const artist = await db.getArtistById(artistId);
      if (!artist) {
        throw new Error('Artist not found');
      }

      // Sync data from each platform
      const spotifyResult = await this.syncSpotifyArtist(artist);
      results.push(spotifyResult);

      const youtubeResult = await this.syncYouTubeArtist(artist);
      results.push(youtubeResult);

      const lastfmResult = await this.syncLastFmArtist(artist);
      results.push(lastfmResult);

      // Update artist stats with aggregated data
      await this.updateArtistStats(artistId);

      return results;
    } catch (error) {
      console.error('Error syncing artist analytics:', error);
      throw error;
    }
  }

  /**
   * Sync analytics for an album across all platforms
   */
  async syncAlbumAnalytics(albumId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    try {
      const album = await db.getAlbumById(albumId);
      if (!album) {
        throw new Error('Album not found');
      }

      // Get all tracks in the album
      const tracks = await db.getTracksByAlbumId(albumId);

      // Sync data for each track from each platform
      const spotifyResult = await this.syncSpotifyAlbum(album, tracks);
      results.push(spotifyResult);

      const youtubeResult = await this.syncYouTubeAlbum(album, tracks);
      results.push(youtubeResult);

      const lastfmResult = await this.syncLastFmAlbum(album, tracks);
      results.push(lastfmResult);

      // Update album stats with aggregated data
      await this.updateAlbumStats(albumId);

      return results;
    } catch (error) {
      console.error('Error syncing album analytics:', error);
      throw error;
    }
  }

  /**
   * Sync artist data from Spotify
   */
  private async syncSpotifyArtist(artist: any): Promise<SyncResult> {
    try {
      const spotifyArtist = await spotifyService.searchArtists(artist.name, 1);

      if (!spotifyArtist || spotifyArtist.length === 0) {
        return {
          success: false,
          platform: 'spotify',
          artistId: artist.id,
          message: 'Artist not found on Spotify',
          dataCount: 0,
        };
      }

      const artist_data = spotifyArtist[0];

      // Store Spotify stats in analytics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.createAnalytics({
        artistId: artist.id,
        platform: 'spotify',
        date: today,
        streams: artist_data.followers,
        revenue: 0,
      });

      return {
        success: true,
        platform: 'spotify',
        artistId: artist.id,
        message: `Synced Spotify data for ${artist.name}`,
        dataCount: 1,
      };
    } catch (error) {
      console.error('Spotify artist sync error:', error);
      return {
        success: false,
        platform: 'spotify',
        artistId: artist.id,
        message: `Error syncing Spotify: ${(error as any).message}`,
        dataCount: 0,
      };
    }
  }

  /**
   * Sync artist data from YouTube
   */
  private async syncYouTubeArtist(artist: any): Promise<SyncResult> {
    try {
      const youtubeChannel = await youtubeService.searchChannel(artist.name);

      if (!youtubeChannel) {
        return {
          success: false,
          platform: 'youtube_music',
          artistId: artist.id,
          message: 'Artist channel not found on YouTube',
          dataCount: 0,
        };
      }

      const channelStats = await youtubeService.getChannelStats(youtubeChannel.channelId);

      if (!channelStats) {
        return {
          success: false,
          platform: 'youtube_music',
          artistId: artist.id,
          message: 'Could not retrieve YouTube channel statistics',
          dataCount: 0,
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.createAnalytics({
        artistId: artist.id,
        platform: 'youtube_music',
        date: today,
        streams: channelStats.viewCount,
        revenue: 0,
      });

      return {
        success: true,
        platform: 'youtube_music',
        artistId: artist.id,
        message: `Synced YouTube data for ${artist.name}`,
        dataCount: 1,
      };
    } catch (error) {
      console.error('YouTube artist sync error:', error);
      return {
        success: false,
        platform: 'youtube_music',
        artistId: artist.id,
        message: `Error syncing YouTube: ${(error as any).message}`,
        dataCount: 0,
      };
    }
  }

  /**
   * Sync artist data from Last.fm
   */
  private async syncLastFmArtist(artist: any): Promise<SyncResult> {
    try {
      const lastfmArtist = await lastfmService.getArtist(artist.name);

      if (!lastfmArtist) {
        return {
          success: false,
          platform: 'lastfm',
          artistId: artist.id,
          message: 'Artist not found on Last.fm',
          dataCount: 0,
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.createAnalytics({
        artistId: artist.id,
        platform: 'lastfm',
        date: today,
        streams: lastfmArtist.playcount,
        revenue: 0,
      });

      return {
        success: true,
        platform: 'lastfm',
        artistId: artist.id,
        message: `Synced Last.fm data for ${artist.name}`,
        dataCount: 1,
      };
    } catch (error) {
      console.error('Last.fm artist sync error:', error);
      return {
        success: false,
        platform: 'lastfm',
        artistId: artist.id,
        message: `Error syncing Last.fm: ${(error as any).message}`,
        dataCount: 0,
      };
    }
  }

  /**
   * Sync album data from Spotify
   */
  private async syncSpotifyAlbum(album: any, tracks: any[]): Promise<SyncResult> {
    try {
      let syncedCount = 0;

      for (const track of tracks) {
        const spotifyTracks = await spotifyService.searchTracks(`${album.artistName} ${track.title}`, 1);

        if (spotifyTracks && spotifyTracks.length > 0) {
          const spotifyTrack = spotifyTracks[0];

          // Update or create track platform record
          await db.upsertTrackPlatform(track.id, 'spotify', {
            url: spotifyTrack.externalUrl,
          });

          syncedCount++;
        }
      }

      return {
        success: syncedCount > 0,
        platform: 'spotify',
        artistId: album.artistId,
        albumId: album.id,
        message: `Synced ${syncedCount} tracks on Spotify for album ${album.title}`,
        dataCount: syncedCount,
      };
    } catch (error) {
      console.error('Spotify album sync error:', error);
      return {
        success: false,
        platform: 'spotify',
        artistId: album.artistId,
        albumId: album.id,
        message: `Error syncing Spotify album: ${(error as any).message}`,
        dataCount: 0,
      };
    }
  }

  /**
   * Sync album data from YouTube
   */
  private async syncYouTubeAlbum(album: any, tracks: any[]): Promise<SyncResult> {
    try {
      let syncedCount = 0;

      for (const track of tracks) {
        const youtubeVideos = await youtubeService.searchTracks(
          `${album.artistName} ${track.title}`,
          1
        );

        if (youtubeVideos && youtubeVideos.length > 0) {
          const youtubeVideo = youtubeVideos[0];
          const stats = await youtubeService.getVideoStats(youtubeVideo.videoId);

          if (stats) {
            // Update or create track platform record
            await db.upsertTrackPlatform(track.id, 'youtube_music', {
              url: `https://www.youtube.com/watch?v=${youtubeVideo.videoId}`,
            });

            // Store video stats in analytics
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await db.createAnalytics({
              artistId: album.artistId,
              albumId: album.id,
              platform: 'youtube_music',
              date: today,
              streams: stats.viewCount,
            });

            syncedCount++;
          }
        }
      }

      return {
        success: syncedCount > 0,
        platform: 'youtube_music',
        artistId: album.artistId,
        albumId: album.id,
        message: `Synced ${syncedCount} tracks on YouTube for album ${album.title}`,
        dataCount: syncedCount,
      };
    } catch (error) {
      console.error('YouTube album sync error:', error);
      return {
        success: false,
        platform: 'youtube_music',
        artistId: album.artistId,
        albumId: album.id,
        message: `Error syncing YouTube album: ${(error as any).message}`,
        dataCount: 0,
      };
    }
  }

  /**
   * Sync album data from Last.fm
   */
  private async syncLastFmAlbum(album: any, tracks: any[]): Promise<SyncResult> {
    try {
      let syncedCount = 0;

      for (const track of tracks) {
        const lastfmTrack = await lastfmService.getTrack(album.artistName, track.title);

        if (lastfmTrack) {
          // Store track stats in analytics
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          await db.createAnalytics({
            artistId: album.artistId,
            albumId: album.id,
            platform: 'lastfm',
            date: today,
            streams: lastfmTrack.playcount,
          });

          syncedCount++;
        }
      }

      return {
        success: syncedCount > 0,
        platform: 'lastfm',
        artistId: album.artistId,
        albumId: album.id,
        message: `Synced ${syncedCount} tracks on Last.fm for album ${album.title}`,
        dataCount: syncedCount,
      };
    } catch (error) {
      console.error('Last.fm album sync error:', error);
      return {
        success: false,
        platform: 'lastfm',
        artistId: album.artistId,
        albumId: album.id,
        message: `Error syncing Last.fm album: ${(error as any).message}`,
        dataCount: 0,
      };
    }
  }

  /**
   * Update artist statistics from aggregated analytics
   */
  private async updateArtistStats(artistId: string): Promise<void> {
    try {
      const analytics = await db.getAnalyticsByArtistId(artistId);

      const totalStreams = analytics.reduce((sum, a) => sum + a.streams, 0);

      await db.updateArtist(artistId, {
        totalStreams,
      });
    } catch (error) {
      console.error('Error updating artist stats:', error);
    }
  }

  /**
   * Update album statistics from aggregated analytics
   */
  private async updateAlbumStats(albumId: string): Promise<void> {
    try {
      const analytics = await db.getAnalyticsByAlbumId(albumId);

      const totalStreams = analytics.reduce((sum, a) => sum + a.streams, 0);

      await db.updateAlbum(albumId, {
        totalStreams,
      });
    } catch (error) {
      console.error('Error updating album stats:', error);
    }
  }

  /**
   * Get aggregated analytics for an artist
   */
  async getAggregatedArtistAnalytics(artistId: string, days: number = 30): Promise<any> {
    try {
      const analytics = await db.getAnalyticsByArtistId(artistId);

      // Filter by days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const filtered = analytics.filter(a => new Date(a.date) >= cutoffDate);

      // Group by platform
      const byPlatform: Record<string, any> = {
        spotify: { streams: 0, revenue: 0, dataPoints: 0 },
        youtube_music: { streams: 0, revenue: 0, dataPoints: 0 },
        lastfm: { streams: 0, revenue: 0, dataPoints: 0 },
      };

      filtered.forEach(item => {
        if (byPlatform[item.platform]) {
          byPlatform[item.platform].streams += item.streams;
          byPlatform[item.platform].revenue += item.revenue;
          byPlatform[item.platform].dataPoints++;
        }
      });

      return {
        artistId,
        period: `Last ${days} days`,
        totalStreams: filtered.reduce((sum, a) => sum + a.streams, 0),
        totalRevenue: filtered.reduce((sum, a) => sum + a.revenue, 0),
        byPlatform,
        dataPoints: filtered.length,
      };
    } catch (error) {
      console.error('Error getting aggregated analytics:', error);
      throw error;
    }
  }

  /**
   * Get aggregated analytics for an album
   */
  async getAggregatedAlbumAnalytics(albumId: string, days: number = 30): Promise<any> {
    try {
      const analytics = await db.getAnalyticsByAlbumId(albumId);

      // Filter by days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const filtered = analytics.filter(a => new Date(a.date) >= cutoffDate);

      // Group by platform
      const byPlatform: Record<string, any> = {
        spotify: { streams: 0, revenue: 0, dataPoints: 0 },
        youtube_music: { streams: 0, revenue: 0, dataPoints: 0 },
        lastfm: { streams: 0, revenue: 0, dataPoints: 0 },
      };

      filtered.forEach(item => {
        if (byPlatform[item.platform]) {
          byPlatform[item.platform].streams += item.streams;
          byPlatform[item.platform].revenue += item.revenue;
          byPlatform[item.platform].dataPoints++;
        }
      });

      return {
        albumId,
        period: `Last ${days} days`,
        totalStreams: filtered.reduce((sum, a) => sum + a.streams, 0),
        totalRevenue: filtered.reduce((sum, a) => sum + a.revenue, 0),
        byPlatform,
        dataPoints: filtered.length,
      };
    } catch (error) {
      console.error('Error getting aggregated album analytics:', error);
      throw error;
    }
  }
}

export const analyticsSyncService = new AnalyticsSyncService();
