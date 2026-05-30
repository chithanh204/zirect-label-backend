import axios from 'axios';
import { config } from '../config/config';

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount?: number;
  likeCount?: number;
}

interface YouTubeChannelStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export class YouTubeService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.youtube.apiKey || '';
  }

  /**
   * Search for tracks/videos on YouTube
   */
  async searchTracks(query: string, maxResults: number = 5): Promise<YouTubeSearchResult[]> {
    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}/search`, {
        params: {
          key: this.apiKey,
          q: query,
          type: 'video',
          part: 'snippet',
          maxResults,
          relevanceLanguage: 'en',
        },
      });

      return response.data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.default?.url,
      }));
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube for tracks');
    }
  }

  /**
   * Get video statistics (views, likes, etc.)
   */
  async getVideoStats(videoId: string): Promise<any> {
    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}/videos`, {
        params: {
          key: this.apiKey,
          id: videoId,
          part: 'statistics,contentDetails',
        },
      });

      if (response.data.items.length === 0) {
        return null;
      }

      const item = response.data.items[0];
      return {
        videoId,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        commentCount: parseInt(item.statistics.commentCount || '0'),
        duration: item.contentDetails.duration,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('YouTube get video stats error:', error);
      throw new Error('Failed to get YouTube video statistics');
    }
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(channelId: string): Promise<YouTubeChannelStats | null> {
    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}/channels`, {
        params: {
          key: this.apiKey,
          id: channelId,
          part: 'statistics',
        },
      });

      if (response.data.items.length === 0) {
        return null;
      }

      const stats = response.data.items[0].statistics;
      return {
        subscriberCount: parseInt(stats.subscriberCount || '0'),
        viewCount: parseInt(stats.viewCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
      };
    } catch (error) {
      console.error('YouTube get channel stats error:', error);
      throw new Error('Failed to get YouTube channel statistics');
    }
  }

  /**
   * Search for artist/channel
   */
  async searchChannel(artistName: string): Promise<any> {
    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}/search`, {
        params: {
          key: this.apiKey,
          q: artistName,
          type: 'channel',
          part: 'snippet',
          maxResults: 1,
        },
      });

      if (response.data.items.length === 0) {
        return null;
      }

      const item = response.data.items[0];
      return {
        channelId: item.id.channelId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.default?.url,
      };
    } catch (error) {
      console.error('YouTube search channel error:', error);
      throw new Error('Failed to search YouTube channels');
    }
  }
}

export const youtubeService = new YouTubeService();
