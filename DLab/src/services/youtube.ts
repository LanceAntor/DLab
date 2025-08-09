// YouTube service for handling video information and downloads
// Note: This is a mock implementation for demonstration purposes
// In a real application, you would need a backend service to handle YouTube API calls

export interface VideoInfo {
  title: string;
  duration: string;
  thumbnail: string;
  videoId: string;
  availableQualities: string[];
}

export interface DownloadOptions {
  quality: string;
  format: 'mp4' | 'mp3';
}

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

  // Mock function to get video information
  async getVideoInfo(url: string): Promise<VideoInfo | null> {
    if (!this.isValidYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Could not extract video ID');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock video information
    return {
      title: 'Lo fi Deep Focus Work and Study - 2 Hours of Ambient Music',
      duration: '2:00:15',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoId,
      availableQualities: ['360', '480', '720', '1080']
    };
  }

  // Mock function to initiate download
  async downloadVideo(videoId: string, options: DownloadOptions): Promise<string> {
    // In a real implementation, this would call your backend API
    // which would handle the actual YouTube video download
    
    console.log(`Downloading video ${videoId} in ${options.quality}p quality as ${options.format}`);
    
    // Simulate download initiation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return download URL or ID
    return `download_${videoId}_${options.quality}p.${options.format}`;
  }

  // Get thumbnail URL
  getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  }
}

export const youtubeService = new YouTubeService();
