import { spotifyService } from './spotifyService';
import { youtubeService } from './youtubeService';
import { lastfmService } from './lastfmService';

export interface AlbumImportResult {
  platform: string;
  success: boolean;
  title?: string;
  artist?: string;
  releaseDate?: string;
  tracks?: Array<{
    position: number;
    title: string;
    duration?: number;
    isrc?: string;
    featuring?: string;
  }>;
  imageUrl?: string;
  message: string;
}

export class AlbumImportService {
  /**
   * Import album information from a Spotify link
   */
  async importFromSpotifyLink(spotifyUrl: string): Promise<AlbumImportResult> {
    try {
      // Extract album ID from Spotify URL
      // Format: https://open.spotify.com/album/ALBUM_ID?si=...
      const albumIdMatch = spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
      if (!albumIdMatch) {
        return {
          platform: 'spotify',
          success: false,
          message: 'Invalid Spotify album URL format',
        };
      }

      const albumId = albumIdMatch[1];

      // Get album details from Spotify API
      // Note: Would need to implement in spotifyService to get album endpoint
      return {
        platform: 'spotify',
        success: false,
        message: 'Spotify album import requires additional API implementation',
      };
    } catch (error) {
      return {
        platform: 'spotify',
        success: false,
        message: `Error importing from Spotify: ${(error as any).message}`,
      };
    }
  }

  /**
   * Import album information from a YouTube link
   */
  async importFromYouTubeLink(youtubeUrl: string): Promise<AlbumImportResult> {
    try {
      // Extract video/playlist ID from YouTube URL
      const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const playlistMatch = youtubeUrl.match(/list=([a-zA-Z0-9_-]+)/);

      if (!videoIdMatch && !playlistMatch) {
        return {
          platform: 'youtube_music',
          success: false,
          message: 'Invalid YouTube URL format',
        };
      }

      return {
        platform: 'youtube_music',
        success: false,
        message: 'YouTube album import requires additional API implementation',
      };
    } catch (error) {
      return {
        platform: 'youtube_music',
        success: false,
        message: `Error importing from YouTube: ${(error as any).message}`,
      };
    }
  }

  /**
   * Search for album metadata across platforms
   */
  async searchAlbumMetadata(
    albumTitle: string,
    artistName: string
  ): Promise<Record<string, AlbumImportResult>> {
    const results: Record<string, AlbumImportResult> = {
      spotify: await this.searchAlbumOnSpotify(albumTitle, artistName),
      youtube_music: await this.searchAlbumOnYouTube(albumTitle, artistName),
      lastfm: await this.searchAlbumOnLastFm(albumTitle, artistName),
    };

    return results;
  }

  /**
   * Search for album on Spotify
   */
  private async searchAlbumOnSpotify(albumTitle: string, artistName: string): Promise<AlbumImportResult> {
    try {
      const query = `album:${albumTitle} artist:${artistName}`;
      const tracks = await spotifyService.searchTracks(query, 1);

      if (!tracks || tracks.length === 0) {
        return {
          platform: 'spotify',
          success: false,
          message: 'Album not found on Spotify',
        };
      }

      const track = tracks[0];
      return {
        platform: 'spotify',
        success: true,
        title: track.albumName,
        artist: track.artistName,
        releaseDate: track.albumName ? track.releaseDate : undefined,
        imageUrl: track.imageUrl,
        tracks: [
          {
            position: 1,
            title: track.name,
            duration: track.duration ? Math.floor(track.duration / 1000) : undefined,
          },
        ],
        message: `Found album "${track.albumName}" on Spotify`,
      };
    } catch (error) {
      return {
        platform: 'spotify',
        success: false,
        message: `Error searching Spotify: ${(error as any).message}`,
      };
    }
  }

  /**
   * Search for album on YouTube
   */
  private async searchAlbumOnYouTube(albumTitle: string, artistName: string): Promise<AlbumImportResult> {
    try {
      const query = `${artistName} ${albumTitle} album`;
      const videos = await youtubeService.searchTracks(query, 5);

      if (!videos || videos.length === 0) {
        return {
          platform: 'youtube_music',
          success: false,
          message: 'Album not found on YouTube',
        };
      }

      // Group videos as tracks
      const tracks = videos.map((video, index) => ({
        position: index + 1,
        title: video.title,
      }));

      return {
        platform: 'youtube_music',
        success: true,
        title: albumTitle,
        artist: artistName,
        tracks,
        imageUrl: videos[0]?.thumbnailUrl,
        message: `Found ${videos.length} videos related to "${albumTitle}" on YouTube`,
      };
    } catch (error) {
      return {
        platform: 'youtube_music',
        success: false,
        message: `Error searching YouTube: ${(error as any).message}`,
      };
    }
  }

  /**
   * Search for album on Last.fm
   */
  private async searchAlbumOnLastFm(albumTitle: string, artistName: string): Promise<AlbumImportResult> {
    try {
      const artist = await lastfmService.getArtist(artistName);

      if (!artist) {
        return {
          platform: 'lastfm',
          success: false,
          message: 'Artist not found on Last.fm',
        };
      }

      return {
        platform: 'lastfm',
        success: true,
        title: albumTitle,
        artist: artistName,
        imageUrl: artist.imageUrl,
        message: `Found artist "${artistName}" on Last.fm`,
      };
    } catch (error) {
      return {
        platform: 'lastfm',
        success: false,
        message: `Error searching Last.fm: ${(error as any).message}`,
      };
    }
  }

  /**
   * Import album data from searched metadata
   */
  async importAlbumData(
    albumTitle: string,
    artistName: string
  ): Promise<{
    title: string;
    coverArt?: string;
    tracks: Array<{
      title: string;
      position: number;
      duration?: number;
      featuring?: string;
      isrc?: string;
    }>;
    metadata: Record<string, AlbumImportResult>;
  }> {
    // Search for album metadata on all platforms
    const metadata = await this.searchAlbumMetadata(albumTitle, artistName);

    // Collect tracks from all successful searches
    const allTracks = new Map<string, any>();

    for (const [platform, result] of Object.entries(metadata)) {
      if (result.success && result.tracks) {
        result.tracks.forEach(track => {
          const key = `${track.position}-${track.title}`;
          if (!allTracks.has(key)) {
            allTracks.set(key, {
              position: track.position,
              title: track.title,
              duration: track.duration,
              featuring: track.featuring,
              isrc: track.isrc,
              platforms: [platform],
            });
          } else {
            allTracks.get(key)!.platforms.push(platform);
          }
        });
      }
    }

    // Sort tracks by position
    const sortedTracks = Array.from(allTracks.values()).sort((a, b) => a.position - b.position);

    // Get cover art from the first successful search
    let coverArt: string | undefined;
    for (const result of Object.values(metadata)) {
      if (result.imageUrl) {
        coverArt = result.imageUrl;
        break;
      }
    }

    return {
      title: albumTitle,
      coverArt,
      tracks: sortedTracks.map(t => ({
        title: t.title,
        position: t.position,
        duration: t.duration,
        featuring: t.featuring,
        isrc: t.isrc,
      })),
      metadata,
    };
  }
}

export const albumImportService = new AlbumImportService();
