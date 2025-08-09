import express from 'express';
import cors from 'cors';
import ytdl from 'ytdl-core';
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
  return filename.replace(/[^a-z0-9\s\-_\.]/gi, '').replace(/\s+/g, '_');
}

// Get video information
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    console.log('Fetching video info for:', url);
    
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    // Get available formats and qualities
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const availableQualities = [...new Set(formats.map(format => format.qualityLabel).filter(Boolean))]
      .sort((a, b) => parseInt(b) - parseInt(a));
    
    const response = {
      title: videoDetails.title,
      duration: formatDuration(parseInt(videoDetails.lengthSeconds)),
      thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url,
      videoId: videoDetails.videoId,
      author: videoDetails.author.name,
      viewCount: videoDetails.viewCount,
      availableQualities: availableQualities.length > 0 ? availableQualities : ['720p', '480p', '360p']
    };
    
    console.log('Video info:', response);
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

// Download video
app.post('/api/download', async (req, res) => {
  try {
    const { url, quality, format } = req.body;
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }
    
    console.log(`Starting download: ${url}, Quality: ${quality}, Format: ${format}`);
    
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
      
      const formatOptions = {
        filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio,
        quality: quality ? `${quality}p` : 'highest'
      };
      
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
        res.status(500).json({ error: 'Download failed' });
      }
    });
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed' });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DLab backend is running' });
});

app.listen(PORT, () => {
  console.log(`DLab backend server running on http://localhost:${PORT}`);
  console.log(`Downloads will be saved to: ${downloadsDir}`);
});
