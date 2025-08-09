import express from 'express';
import cors from 'cors';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to sanitize filename
function sanitizeFilename(filename) {
  if (!filename) return 'download';
  return filename.replace(/[^a-z0-9\s\-_\.]/gi, '').replace(/\s+/g, '_').substring(0, 100);
}

// Helper function to extract video ID
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Get video information
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('Received request for URL:', url);
    
    if (!url) {
      console.log('No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Basic URL validation
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.log('Invalid YouTube URL format');
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }
    
    console.log('Extracted video ID:', videoId);
    
    // Validate URL using ytdl
    if (!ytdl.validateURL(url)) {
      console.log('ytdl validation failed');
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    console.log('Fetching video info...');
    
    // Get video info with timeout
    const info = await Promise.race([
      ytdl.getInfo(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]);
    
    console.log('Video info retrieved successfully');
    
    const videoDetails = info.videoDetails;
    
    if (!videoDetails) {
      throw new Error('No video details found');
    }
    
    // Get available formats and qualities
    let availableQualities = ['360p', '480p', '720p']; // Default qualities
    
    try {
      const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      const qualities = [...new Set(formats.map(format => format.qualityLabel).filter(Boolean))]
        .sort((a, b) => parseInt(b) - parseInt(a));
      
      if (qualities.length > 0) {
        availableQualities = qualities;
      }
    } catch (formatError) {
      console.log('Error getting formats, using defaults:', formatError.message);
    }
    
    const response = {
      title: videoDetails.title || 'Unknown Title',
      duration: formatDuration(parseInt(videoDetails.lengthSeconds) || 0),
      thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || '',
      videoId: videoDetails.videoId || videoId,
      author: videoDetails.author?.name || 'Unknown Author',
      viewCount: videoDetails.viewCount || '0',
      availableQualities: availableQualities
    };
    
    console.log('Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('Detailed error in video-info:', error);
    
    // More specific error messages
    let errorMessage = 'Failed to fetch video information';
    
    if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video is unavailable or private';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message.includes('age-restricted')) {
      errorMessage = 'Age-restricted videos are not supported';
    } else if (error.message.includes('private')) {
      errorMessage = 'Private videos cannot be downloaded';
    } else if (error.message.includes('region')) {
      errorMessage = 'Video is not available in your region';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Download video
app.post('/api/download', async (req, res) => {
  try {
    const { url, quality, format } = req.body;
    
    console.log(`Starting download: ${url}, Quality: ${quality}, Format: ${format}`);
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }
    
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    const sanitizedTitle = sanitizeFilename(videoDetails.title);
    
    let filename;
    let downloadStream;
    
    if (format === 'mp3') {
      // Audio only download
      filename = `${sanitizedTitle}.mp3`;
      downloadStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio'
      });
    } else {
      // Video download
      filename = `${sanitizedTitle}_${quality || 'best'}.mp4`;
      
      // Try to get the requested quality, fallback to best available
      let formatOptions = {
        filter: 'videoandaudio',
        quality: 'highest'
      };
      
      if (quality) {
        formatOptions.quality = `${quality}p`;
      }
      
      downloadStream = ytdl(url, formatOptions);
    }
    
    const filePath = path.join(downloadsDir, filename);
    
    // Set response headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    
    // Stream the download to both file and response
    const writeStream = fs.createWriteStream(filePath);
    
    downloadStream.pipe(writeStream);
    downloadStream.pipe(res);
    
    downloadStream.on('end', () => {
      console.log(`Download completed: ${filename}`);
    });
    
    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed: ' + error.message });
      }
    });
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed: ' + error.message });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DLab backend is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 DLab backend server running on http://localhost:${PORT}`);
  console.log(`📁 Downloads will be saved to: ${downloadsDir}`);
  console.log(`🎥 Using @distube/ytdl-core for YouTube processing`);
});
