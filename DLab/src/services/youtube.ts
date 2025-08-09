// YouTube service for handling video information and downloads
// Updated to work with real backend API

export interface VideoInfo {
  title: string;
  duration: string;
  thumbnail: string;
  videoId: string;
  author?: string;
  viewCount?: string;
  availableQualities: string[];
  qualityNote?: string;
}

export interface DownloadOptions {
  quality: string;
  format: 'mp4' | 'mp3';
}

const API_BASE_URL = 'http://localhost:3001/api';

class YouTubeService {
  // Extract video ID from YouTube URL
  extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Validate YouTube URL
  isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  }

  // Get video information from backend
  async getVideoInfo(url: string): Promise<VideoInfo | null> {
    if (!this.isValidYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/video-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch video information');
      }

      const videoInfo = await response.json();
      return videoInfo;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error while fetching video information');
    }
  }

  // Download video through backend
  async downloadVideo(url: string, options: DownloadOptions): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          quality: options.quality,
          format: options.format
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start download');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      console.log('Content-Disposition header:', contentDisposition);
      
      let filename = `download.${options.format}`;
      
      if (contentDisposition) {
        // Try multiple patterns to extract filename
        let filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
          console.log('Extracted filename (UTF-8):', filename);
        } else {
          filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
            console.log('Extracted filename (quoted):', filename);
          } else {
            filenameMatch = contentDisposition.match(/filename=([^;]+)/);
            if (filenameMatch) {
              filename = filenameMatch[1].trim();
              console.log('Extracted filename (unquoted):', filename);
            }
          }
        }
      } else {
        console.log('No Content-Disposition header found');
      }
      
      console.log('Final filename for download:', filename);

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create temporary link for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Download failed');
    }
  }

  // Check if backend is available
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get thumbnail URL
  getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  }
}

export const youtubeService = new YouTubeService();
