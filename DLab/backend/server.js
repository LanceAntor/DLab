import express from 'express';
import cors from 'cors';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const app = express();
const PORT = 3001;

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Middleware
app.use(cors({
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
}));
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
  
  // Remove problematic characters and replace spaces with underscores
  const sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove Windows forbidden chars
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .trim()
    .substring(0, 100); // Limit length
  
  return sanitized || 'download';
}

// Helper function to extract video ID
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Helper function to merge video and audio using FFmpeg
function mergeVideoAudio(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('Starting FFmpeg merge...');
    console.log('Video:', videoPath);
    console.log('Audio:', audioPath);
    console.log('Output:', outputPath);
    
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',  // Copy video stream without re-encoding
        '-c:a aac',   // Re-encode audio to AAC
        '-strict experimental'
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Merging progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('FFmpeg merge completed successfully');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
}

// Helper function to download stream to file
function downloadStreamToFile(url, format, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${format.qualityLabel || 'stream'} to ${outputPath}`);
    
    const stream = ytdl(url, { format: format });
    const writeStream = fs.createWriteStream(outputPath);
    
    stream.pipe(writeStream);
    
    stream.on('end', () => {
      console.log(`Download completed: ${outputPath}`);
      resolve();
    });
    
    stream.on('error', (error) => {
      console.error(`Download error for ${outputPath}:`, error);
      reject(error);
    });
    
    writeStream.on('error', (error) => {
      console.error(`Write error for ${outputPath}:`, error);
      reject(error);
    });
  });
}

// Helper function to get available qualities
function getAvailableQualities(formats) {
  console.log('=== QUALITY DETECTION START ===');
  console.log('Total formats available:', formats.length);
  
  // Get video+audio formats (direct download)
  const videoAndAudioFormats = formats.filter(format => 
    format.hasVideo && 
    format.hasAudio &&
    format.height && 
    format.height > 0
  );
  
  // Get video-only formats (can be merged with audio)
  const videoOnlyFormats = formats.filter(format => 
    format.hasVideo && 
    !format.hasAudio &&
    format.height && 
    format.height > 0
  );
  
  // Get audio formats for merging
  const audioFormats = formats.filter(format => 
    !format.hasVideo && 
    format.hasAudio
  );
  
  console.log('Video+Audio formats found:', videoAndAudioFormats.length);
  console.log('Video-only formats found:', videoOnlyFormats.length);
  console.log('Audio-only formats found:', audioFormats.length);
  
  const qualities = new Set();
  
  // Add qualities from video+audio formats (preferred - direct download)
  videoAndAudioFormats.forEach((format, index) => {
    console.log(`Direct Format ${index}:`, {
      itag: format.itag,
      height: format.height,
      qualityLabel: format.qualityLabel,
      container: format.container
    });
    
    if (format.height) {
      qualities.add(`${format.height}p`);
    }
  });
  
  // Add qualities from video-only formats (can be merged if audio available)
  console.log('Adding all video-only qualities (will merge with audio during download):');
  videoOnlyFormats.forEach((format, index) => {
    console.log(`Video-only Format ${index}:`, {
      itag: format.itag,
      height: format.height,
      qualityLabel: format.qualityLabel,
      container: format.container
    });
    
    if (format.height) {
      qualities.add(`${format.height}p`);
    }
  });
  
  console.log('All available qualities:', Array.from(qualities));
  
  // Convert to array and sort by resolution (highest first)
  let qualityArray = Array.from(qualities)
    .filter(q => q.match(/^\d+p$/))
    .sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      return bNum - aNum;
    });
  
  console.log('Sorted qualities:', qualityArray);
  
  // If no qualities detected, provide defaults
  if (qualityArray.length === 0) {
    console.log('No qualities detected, using defaults');
    qualityArray = ['1080p', '720p', '480p', '360p'];
  }
  
  console.log('Final available qualities:', qualityArray);
  console.log('=== QUALITY DETECTION END ===');
  
  return qualityArray;
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
    let availableQualities = ['1080p', '720p', '480p', '360p']; // Default qualities
    
    try {
      const allFormats = info.formats || [];
      console.log('=== FORMAT ANALYSIS START ===');
      console.log('Total formats available:', allFormats.length);
      
      // Log a sample of formats for debugging
      allFormats.slice(0, 5).forEach((format, index) => {
        console.log(`Sample format ${index}:`, {
          itag: format.itag,
          height: format.height,
          qualityLabel: format.qualityLabel,
          hasVideo: format.hasVideo,
          hasAudio: format.hasAudio,
          container: format.container
        });
      });
      
      // Try multiple approaches to get video formats
      const videoAndAudioFormats = ytdl.filterFormats(allFormats, 'videoandaudio');
      const videoOnlyFormats = ytdl.filterFormats(allFormats, 'videoonly');
      const audioOnlyFormats = ytdl.filterFormats(allFormats, 'audioonly');
      
      console.log('Video+Audio formats:', videoAndAudioFormats.length);
      console.log('Video-only formats:', videoOnlyFormats.length);
      console.log('Audio-only formats:', audioOnlyFormats.length);
      
      // Combine all video formats for quality analysis
      const allVideoFormats = [...videoAndAudioFormats, ...videoOnlyFormats];
      console.log('Combined video formats:', allVideoFormats.length);
      
      // Get qualities using helper function
      if (allVideoFormats.length > 0) {
        availableQualities = getAvailableQualities(allVideoFormats);
      } else {
        console.log('No video formats found, analyzing all formats...');
        // Last resort: analyze all formats
        availableQualities = getAvailableQualities(allFormats);
      }
      
      // Check which qualities actually have audio
      const qualitiesWithAudio = [];
      const qualitiesVideoOnly = [];
      
      availableQualities.forEach(quality => {
        const qualityNum = parseInt(quality);
        const hasAudioFormat = allVideoFormats.some(f => 
          f.height === qualityNum && f.hasVideo && f.hasAudio
        );
        
        if (hasAudioFormat) {
          qualitiesWithAudio.push(quality);
        } else {
          qualitiesVideoOnly.push(quality);
        }
      });
      
      console.log('Qualities with audio:', qualitiesWithAudio);
      console.log('Qualities video-only:', qualitiesVideoOnly);
      
      console.log('Final available qualities from format analysis:', availableQualities);
      console.log('=== FORMAT ANALYSIS END ===');
      
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
      availableQualities: availableQualities,
      qualityNote: availableQualities.length > 1 
        ? 'Higher qualities (720p, 1080p) will be merged with audio for best quality!'
        : availableQualities.includes('360p')
        ? 'Only 360p with audio is available for this video'
        : 'Limited quality options available'
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
    
    console.log(`\n=== DOWNLOAD REQUEST ===`);
    console.log(`URL: ${url}`);
    console.log(`Quality: ${quality}p`);
    console.log(`Format: ${format}`);
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }
    
    console.log('Getting video info for download...');
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    console.log(`Raw video title: "${videoDetails.title}"`);
    const sanitizedTitle = sanitizeFilename(videoDetails.title);
    console.log(`Sanitized title: "${sanitizedTitle}"`);
    
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
      // Video download with high-quality support
      filename = `${sanitizedTitle}_${quality || 'best'}p.mp4`;
      console.log(`Generated filename: "${filename}"`);
      
      const allFormats = info.formats || [];
      const videoAndAudioFormats = ytdl.filterFormats(allFormats, 'videoandaudio');
      const videoOnlyFormats = ytdl.filterFormats(allFormats, 'videoonly');
      const audioOnlyFormats = ytdl.filterFormats(allFormats, 'audioonly');
      
      console.log(`\n=== FORMAT ANALYSIS ===`);
      console.log(`Video+Audio formats: ${videoAndAudioFormats.length}`);
      console.log(`Video-only formats: ${videoOnlyFormats.length}`);
      console.log(`Audio-only formats: ${audioOnlyFormats.length}`);
      
      // Try to find exact quality match in video+audio formats first
      let selectedVideoFormat = videoAndAudioFormats.find(f => 
        f.qualityLabel === `${quality}p` || f.height === parseInt(quality)
      );
      
      if (selectedVideoFormat) {
        console.log(`✅ Found ${quality}p with audio: ${selectedVideoFormat.qualityLabel} (itag: ${selectedVideoFormat.itag})`);
        
        // Simple download - already has audio
        downloadStream = ytdl(url, { format: selectedVideoFormat });
        
      } else {
        console.log(`❌ No ${quality}p with audio found. Checking video-only formats...`);
        
        // Find video-only format for the requested quality
        selectedVideoFormat = videoOnlyFormats.find(f => 
          f.qualityLabel === `${quality}p` || f.height === parseInt(quality)
        );
        
        if (selectedVideoFormat && audioOnlyFormats.length > 0) {
          console.log(`🔧 Found ${quality}p video-only. Will merge with audio!`);
          console.log(`Video format: ${selectedVideoFormat.qualityLabel} (itag: ${selectedVideoFormat.itag})`);
          
          // Get the best audio format
          const selectedAudioFormat = audioOnlyFormats.reduce((best, current) => {
            const currentBitrate = current.audioBitrate || 0;
            const bestBitrate = best.audioBitrate || 0;
            return currentBitrate > bestBitrate ? current : best;
          });
          
          console.log(`Audio format: ${selectedAudioFormat.audioBitrate}kbps (itag: ${selectedAudioFormat.itag})`);
          
          // Create temporary file paths
          const tempDir = path.join(downloadsDir, 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
          }
          
          const videoTempPath = path.join(tempDir, `video_${Date.now()}.mp4`);
          const audioTempPath = path.join(tempDir, `audio_${Date.now()}.m4a`);
          const finalPath = path.join(downloadsDir, filename);
          
          console.log('\n=== STARTING MERGE PROCESS ===');
          
          // Set response headers early with proper filename encoding
          const encodedFilename = encodeURIComponent(filename);
          const dispositionHeader = `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;
          
          console.log(`Setting Content-Disposition header: ${dispositionHeader}`);
          res.setHeader('Content-Disposition', dispositionHeader);
          res.setHeader('Content-Type', 'video/mp4');
          
          try {
            // Download video and audio streams separately
            console.log('1. Downloading video stream...');
            await downloadStreamToFile(url, selectedVideoFormat, videoTempPath);
            
            console.log('2. Downloading audio stream...');
            await downloadStreamToFile(url, selectedAudioFormat, audioTempPath);
            
            console.log('3. Merging video and audio...');
            await mergeVideoAudio(videoTempPath, audioTempPath, finalPath);
            
            console.log('4. Sending merged file to client...');
            
            // Stream the final merged file to the response
            const fileStream = fs.createReadStream(finalPath);
            fileStream.pipe(res);
            
            fileStream.on('end', () => {
              console.log('✅ Merged download completed successfully!');
              
              // Cleanup all temporary and final files
              try {
                fs.unlinkSync(videoTempPath);
                fs.unlinkSync(audioTempPath);
                fs.unlinkSync(finalPath); // Also remove the merged file
                console.log('All temporary and final files cleaned up');
              } catch (cleanupError) {
                console.error('Error cleaning up files:', cleanupError);
              }
            });
            
            fileStream.on('error', (error) => {
              console.error('Error streaming final file:', error);
              if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming merged video' });
              }
            });
            
            return; // Exit early since we're handling the response manually
            
          } catch (mergeError) {
            console.error('Error in merge process:', mergeError);
            
            // Cleanup on error
            [videoTempPath, audioTempPath, finalPath].forEach(tempPath => {
              if (fs.existsSync(tempPath)) {
                try {
                  fs.unlinkSync(tempPath);
                  console.log(`Cleaned up: ${tempPath}`);
                } catch (cleanupError) {
                  console.error('Error cleaning up temp file:', cleanupError);
                }
              }
            });
            
            if (!res.headersSent) {
              res.status(500).json({ 
                error: `Failed to merge ${quality}p video with audio. ${mergeError.message}` 
              });
            }
            return;
          }
          
        } else {
          console.log(`❌ Cannot provide ${quality}p with audio. Falling back to best available quality with audio.`);
          
          // Fallback to best video+audio format
          if (videoAndAudioFormats.length > 0) {
            const bestFormat = videoAndAudioFormats.reduce((best, current) => {
              const currentHeight = current.height || 0;
              const bestHeight = best.height || 0;
              return currentHeight > bestHeight ? current : best;
            });
            
            console.log(`Using fallback: ${bestFormat.qualityLabel} with audio`);
            filename = `${sanitizedTitle}_${bestFormat.height}p_with_audio.mp4`;
            downloadStream = ytdl(url, { format: bestFormat });
          } else {
            console.log('Using highest available quality');
            downloadStream = ytdl(url, {
              filter: 'videoandaudio',
              quality: 'highest'
            });
          }
        }
      }
    }
    
    // Handle simple downloads (non-merged)
    if (downloadStream) {
      console.log(`Preparing download: ${filename}`);
      console.log(`Video title: ${videoDetails.title}`);
      
      // Set response headers with proper filename encoding
      const encodedFilename = encodeURIComponent(filename);
      const dispositionHeader = `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;
      
      console.log(`Setting Content-Disposition header: ${dispositionHeader}`);
      res.setHeader('Content-Disposition', dispositionHeader);
      res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
      
      // Add timeout
      const downloadTimeout = setTimeout(() => {
        console.error('Download timeout reached');
        if (!res.headersSent) {
          res.status(408).json({ error: 'Download timeout. Please try again.' });
        }
      }, 120000);
      
      downloadStream.on('error', (error) => {
        clearTimeout(downloadTimeout);
        console.error('Download stream error:', error);
        
        if (!res.headersSent) {
          let errorMessage = 'Download failed';
          
          if (error.message.includes('No such format found')) {
            errorMessage = `The selected quality (${quality}p) is not available. Please try a different quality.`;
          } else if (error.message.includes('Video unavailable')) {
            errorMessage = 'Video is unavailable or private';
          } else if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
            errorMessage = 'Network connection error. Please try again.';
          }
          
          res.status(500).json({ error: errorMessage });
        }
      });
      
      downloadStream.on('end', () => {
        clearTimeout(downloadTimeout);
        console.log(`✅ Download completed successfully: ${filename}`);
      });
      
      // Pipe directly to browser response (no server-side saving)
      downloadStream.pipe(res);
    }
    
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
