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

// Download progress tracking
const downloadSessions = new Map();

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

// Helper function to merge video and audio with progress tracking
function mergeVideoAudioWithProgress(sessionId, videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const session = downloadSessions.get(sessionId);
    if (!session) {
      reject(new Error('Session not found'));
      return;
    }
    
    console.log('Starting FFmpeg merge with progress tracking...');
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
        if (progress.percent && !session.stopped) {
          const mergeProgress = Math.round(progress.percent);
          console.log(`Merging progress: ${mergeProgress}%`);
          // Map FFmpeg progress (0-100%) to our progress range (80-100%)
          session.progress = Math.min(80 + Math.round((mergeProgress / 100) * 20), 100);
        }
      })
      .on('end', () => {
        console.log('FFmpeg merge completed successfully');
        if (!session.stopped) {
          session.progress = 100;
        }
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

// Start download with progress tracking
app.post('/api/download-with-progress', async (req, res) => {
  try {
    const { url, quality, format } = req.body;
    const sessionId = Date.now().toString();
    
    console.log(`\n=== DOWNLOAD WITH PROGRESS REQUEST ===`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`URL: ${url}`);
    console.log(`Quality: ${quality}p`);
    console.log(`Format: ${format}`);
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }
    
    // Initialize session
    downloadSessions.set(sessionId, {
      status: 'starting',
      progress: 0,
      downloaded: 0,
      total: 0,
      filename: '',
      paused: false,
      stopped: false,
      startTime: Date.now(),
      filePaths: [] // Track all files that might need cleanup
    });
    
    // Start download process asynchronously
    startDownloadProcess(sessionId, url, quality, format);
    
    res.json({ sessionId });
  } catch (error) {
    console.error('Download initiation error:', error);
    res.status(500).json({ error: 'Failed to start download: ' + error.message });
  }
});

// Get download progress
app.get('/api/download-progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = downloadSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

// Pause download
app.post('/api/download-pause/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = downloadSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.paused = !session.paused;
  session.status = session.paused ? 'paused' : 'downloading';
  
  res.json({ sessionId, paused: session.paused });
});

// Stop download
app.post('/api/download-stop/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = downloadSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.stopped = true;
  session.status = 'stopped';
  
  // Immediately clean up any partial files
  cleanupSessionFiles(session, sessionId);
  
  // Additional cleanup after a short delay to catch any files that might still be in use
  setTimeout(() => {
    cleanupSessionFiles(session, sessionId);
    downloadSessions.delete(sessionId);
  }, 2000);
  
  // Final cleanup after a longer delay as a fallback
  setTimeout(() => {
    cleanupSessionFiles(session, sessionId);
  }, 5000);
  
  res.json({ sessionId, stopped: true });
});

// Helper function to start download process
async function startDownloadProcess(sessionId, url, quality, format) {
  const session = downloadSessions.get(sessionId);
  if (!session) return;
  
  try {
    session.status = 'fetching_info';
    
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    const sanitizedTitle = sanitizeFilename(videoDetails.title);
    let filename;
    
    if (format === 'mp3') {
      filename = `${sanitizedTitle}.mp3`;
    } else {
      filename = `${sanitizedTitle}_${quality || 'best'}p.mp4`;
    }
    
    session.filename = filename;
    session.status = 'downloading';
    
    const filePath = path.join(downloadsDir, filename);
    session.filePath = filePath;
    session.filePaths.push(filePath); // Track for cleanup
    
    const fileStream = fs.createWriteStream(filePath);
    
    let downloadStream;
    
    if (format === 'mp3') {
      downloadStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio'
      });
    } else {
      // Use the same robust logic as the original download endpoint
      const allFormats = info.formats || [];
      const videoAndAudioFormats = ytdl.filterFormats(allFormats, 'videoandaudio');
      const videoOnlyFormats = ytdl.filterFormats(allFormats, 'videoonly');
      const audioOnlyFormats = ytdl.filterFormats(allFormats, 'audioonly');
      
      console.log(`\n=== FORMAT ANALYSIS FOR ${quality}p ===`);
      console.log(`Video+Audio formats: ${videoAndAudioFormats.length}`);
      console.log(`Video-only formats: ${videoOnlyFormats.length}`);
      console.log(`Audio-only formats: ${audioOnlyFormats.length}`);
      
      // Try to find exact quality match in video+audio formats first
      let selectedVideoFormat = videoAndAudioFormats.find(f => 
        f.qualityLabel === `${quality}p` || f.height === parseInt(quality)
      );
      
      if (selectedVideoFormat) {
        console.log(`✅ Found ${quality}p with audio: ${selectedVideoFormat.qualityLabel} (itag: ${selectedVideoFormat.itag})`);
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
          
          // For progress tracking downloads, we need to handle merging differently
          // Let's download and merge, then track the merged file
          await downloadAndMergeWithProgress(sessionId, url, selectedVideoFormat, selectedAudioFormat, filePath);
          return; // Exit early as merging is handled separately
          
        } else {
          console.log(`❌ Cannot provide ${quality}p. Falling back to best available quality.`);
          
          // Fallback to best video+audio format
          if (videoAndAudioFormats.length > 0) {
            const bestFormat = videoAndAudioFormats.reduce((best, current) => {
              const currentHeight = current.height || 0;
              const bestHeight = best.height || 0;
              return currentHeight > bestHeight ? current : best;
            });
            
            console.log(`Using fallback: ${bestFormat.qualityLabel} with audio`);
            session.filename = `${sanitizedTitle}_${bestFormat.height}p_with_audio.mp4`;
            filename = session.filename;
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
    
    let downloaded = 0;
    
    downloadStream.on('response', (response) => {
      const totalSize = parseInt(response.headers['content-length']) || 0;
      session.total = totalSize;
      
      response.on('data', (chunk) => {
        if (session.stopped) {
          console.log('Download stopped, cleaning up...');
          downloadStream.destroy();
          fileStream.destroy();
          
          // Clean up partial file immediately
          setTimeout(() => {
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up partial file: ${filePath}`);
              } catch (error) {
                console.error(`Error cleaning up partial file:`, error);
              }
            }
          }, 100);
          
          return;
        }
        
        if (session.paused) {
          // Simple pause simulation - in a real implementation, you'd need more sophisticated pause/resume
          return;
        }
        
        downloaded += chunk.length;
        session.downloaded = downloaded;
        session.progress = totalSize > 0 ? Math.round((downloaded / totalSize) * 100) : 0;
      });
    });
    
    downloadStream.pipe(fileStream);
    
    downloadStream.on('end', () => {
      if (!session.stopped) {
        session.status = 'completed';
        session.progress = 100;
        session.filePath = filePath;
      }
    });
    
    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      session.status = 'error';
      session.error = error.message;
      
      // Clean up partial file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      session.status = 'error';
      session.error = error.message;
    });
    
  } catch (error) {
    console.error('Download process error:', error);
    session.status = 'error';
    session.error = error.message;
  }
}

// Helper function to download and merge video+audio with progress tracking
async function downloadAndMergeWithProgress(sessionId, url, videoFormat, audioFormat, finalPath) {
  const session = downloadSessions.get(sessionId);
  if (!session) return;
  
  try {
    // Create temporary file paths
    const tempDir = path.join(downloadsDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const videoTempPath = path.join(tempDir, `video_${sessionId}.mp4`);
    const audioTempPath = path.join(tempDir, `audio_${sessionId}.m4a`);
    
    // Track temp files for cleanup
    session.filePaths.push(videoTempPath, audioTempPath, finalPath);
    
    console.log('\n=== STARTING MERGE PROCESS WITH PROGRESS ===');
    
    session.status = 'downloading';
    
    // Initialize tracking for combined download
    session.videoDownloaded = 0;
    session.videoTotal = 0;
    session.audioDownloaded = 0;
    session.audioTotal = 0;
    session.downloaded = 0;
    session.total = 0;
    
    // Get stream sizes first
    console.log('Getting stream sizes...');
    try {
      const videoSize = await getStreamSize(url, videoFormat);
      const audioSize = await getStreamSize(url, audioFormat);
      
      session.videoTotal = videoSize;
      session.audioTotal = audioSize;
      session.total = videoSize + audioSize;
      
      console.log(`Video size: ${videoSize} bytes, Audio size: ${audioSize} bytes, Total: ${session.total} bytes`);
    } catch (error) {
      console.log('Could not get stream sizes, proceeding with unknown total:', error.message);
    }
    
    // Download video stream with progress tracking
    console.log('1. Downloading video stream...');
    await downloadStreamWithProgress(sessionId, url, videoFormat, videoTempPath, 'video');
    
    if (session.stopped) {
      cleanupTempFiles([videoTempPath, audioTempPath, finalPath]);
      return;
    }
    
    // Download audio stream with progress tracking
    console.log('2. Downloading audio stream...');
    await downloadStreamWithProgress(sessionId, url, audioFormat, audioTempPath, 'audio');
    
    if (session.stopped) {
      cleanupTempFiles([videoTempPath, audioTempPath, finalPath]);
      return;
    }
    
    // Merge video and audio
    console.log('3. Merging video and audio...');
    session.status = 'merging';
    session.progress = 80; // Show that we're in final stage (80-100% for merging)
    
    await mergeVideoAudioWithProgress(sessionId, videoTempPath, audioTempPath, finalPath);
    
    if (!session.stopped) {
      session.status = 'completed';
      session.progress = 100;
      session.filePath = finalPath;
    }
    
    // Cleanup temp files
    cleanupTempFiles([videoTempPath, audioTempPath]);
    console.log('✅ Merged download completed successfully!');
    
  } catch (error) {
    console.error('Error in merge process:', error);
    session.status = 'error';
    session.error = error.message;
    
    // Cleanup on error
    cleanupTempFiles([videoTempPath, audioTempPath, finalPath]);
  }
}

// Helper function to download stream with progress tracking
function downloadStreamWithProgress(sessionId, url, format, outputPath, streamType) {
  return new Promise((resolve, reject) => {
    const session = downloadSessions.get(sessionId);
    if (!session) {
      reject(new Error('Session not found'));
      return;
    }
    
    console.log(`Downloading ${streamType} ${format.qualityLabel || 'stream'} to ${outputPath}`);
    
    const stream = ytdl(url, { format: format });
    const fileStream = fs.createWriteStream(outputPath);
    
    let downloaded = 0;
    let streamTotal = 0;
    
    stream.on('response', (response) => {
      streamTotal = parseInt(response.headers['content-length']) || 0;
      console.log(`${streamType} stream size: ${streamTotal} bytes`);
      
      response.on('data', (chunk) => {
        if (session.stopped) {
          console.log(`${streamType} download stopped, cleaning up...`);
          stream.destroy();
          fileStream.destroy();
          
          // Clean up the partial file immediately
          setTimeout(() => {
            if (fs.existsSync(outputPath)) {
              try {
                fs.unlinkSync(outputPath);
                console.log(`Cleaned up partial ${streamType} file: ${outputPath}`);
              } catch (error) {
                console.error(`Error cleaning up partial ${streamType} file:`, error);
              }
            }
          }, 100);
          
          reject(new Error('Download stopped'));
          return;
        }
        
        if (session.paused) {
          // Simple pause simulation
          return;
        }
        
        downloaded += chunk.length;
        
        // Update progress (video gets 0-40%, audio gets 40-80%, merge gets 80-100%)
        let progressBase = streamType === 'video' ? 0 : 40;
        let progressRange = 40;
        let streamProgress = streamTotal > 0 ? (downloaded / streamTotal) * progressRange : 0;
        
        session.progress = Math.min(Math.round(progressBase + streamProgress), 100);
        
        // Update download info for display
        if (streamType === 'video') {
          session.videoDownloaded = downloaded;
          // Only update total if we don't have it pre-calculated
          if (session.videoTotal === 0) {
            session.videoTotal = streamTotal;
          }
        } else {
          session.audioDownloaded = downloaded;
          // Only update total if we don't have it pre-calculated
          if (session.audioTotal === 0) {
            session.audioTotal = streamTotal;
          }
        }
        
        // Calculate combined totals for display
        const combinedDownloaded = (session.videoDownloaded || 0) + (session.audioDownloaded || 0);
        const combinedTotal = (session.videoTotal || 0) + (session.audioTotal || 0);
        
        // Set display values to show combined progress
        session.downloaded = combinedDownloaded;
        // Only update total if we have a better calculation
        if (combinedTotal > session.total) {
          session.total = combinedTotal;
        }
      });
    });
    
    stream.pipe(fileStream);
    
    stream.on('end', () => {
      console.log(`${streamType} download completed: ${outputPath}`);
      resolve();
    });
    
    stream.on('error', (error) => {
      console.error(`${streamType} download error:`, error);
      fileStream.destroy();
      
      // Clean up partial file on error
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          console.log(`Cleaned up partial ${streamType} file after error: ${outputPath}`);
        } catch (cleanupError) {
          console.error(`Error cleaning up partial ${streamType} file:`, cleanupError);
        }
      }
      
      reject(error);
    });
    
    fileStream.on('error', (error) => {
      console.error(`${streamType} file stream error:`, error);
      
      // Clean up partial file on file stream error
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          console.log(`Cleaned up partial ${streamType} file after file error: ${outputPath}`);
        } catch (cleanupError) {
          console.error(`Error cleaning up partial ${streamType} file:`, cleanupError);
        }
      }
      
      reject(error);
    });
  });
}

// Helper function to cleanup temp files
function cleanupTempFiles(filePaths) {
  filePaths.forEach(tempPath => {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
        console.log(`Cleaned up: ${tempPath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
  });
}

// Helper function to cleanup all files associated with a session
function cleanupSessionFiles(session, sessionId) {
  console.log(`Cleaning up files for stopped session: ${sessionId}`);
  
  // Clean up main file path if exists
  if (session.filePath && fs.existsSync(session.filePath)) {
    try {
      fs.unlinkSync(session.filePath);
      console.log(`Cleaned up main file: ${session.filePath}`);
    } catch (error) {
      console.error(`Error cleaning up main file:`, error);
      // If file is in use, try again later
      setTimeout(() => {
        try {
          if (fs.existsSync(session.filePath)) {
            fs.unlinkSync(session.filePath);
            console.log(`Delayed cleanup successful: ${session.filePath}`);
          }
        } catch (err) {
          console.error(`Delayed cleanup failed:`, err);
        }
      }, 3000);
    }
  }
  
  // Clean up tracked file paths
  if (session.filePaths && session.filePaths.length > 0) {
    session.filePaths.forEach(filePath => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up tracked file: ${filePath}`);
        } catch (error) {
          console.error(`Error cleaning up tracked file ${filePath}:`, error);
          // Retry after delay for files that might be in use
          setTimeout(() => {
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Delayed cleanup successful: ${filePath}`);
              }
            } catch (err) {
              console.error(`Delayed cleanup failed for ${filePath}:`, err);
            }
          }, 3000);
        }
      }
    });
  }
  
  // Clean up common temp file patterns for this session
  const tempDir = path.join(downloadsDir, 'temp');
  if (fs.existsSync(tempDir)) {
    const possibleTempFiles = [
      path.join(tempDir, `video_${sessionId}.mp4`),
      path.join(tempDir, `audio_${sessionId}.m4a`),
      path.join(downloadsDir, `${sessionId}_*.mp4`),
      path.join(downloadsDir, `${sessionId}_*.mp3`)
    ];
    
    possibleTempFiles.forEach(pattern => {
      // For patterns with wildcards, we need to check if the file exists
      if (pattern.includes('*')) {
        // This is a simplified approach - in a real app you might use glob
        return;
      }
      
      if (fs.existsSync(pattern)) {
        try {
          fs.unlinkSync(pattern);
          console.log(`Cleaned up temp file: ${pattern}`);
        } catch (error) {
          console.error(`Error cleaning up temp file ${pattern}:`, error);
          // Retry after delay
          setTimeout(() => {
            try {
              if (fs.existsSync(pattern)) {
                fs.unlinkSync(pattern);
                console.log(`Delayed cleanup successful: ${pattern}`);
              }
            } catch (err) {
              console.error(`Delayed cleanup failed for ${pattern}:`, err);
            }
          }, 3000);
        }
      }
    });
  }
  
  // Clear the filePaths array to prevent double cleanup
  if (session.filePaths) {
    session.filePaths = [];
  }
}

// Helper function to get stream size
function getStreamSize(url, format) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { format: format });
    
    stream.on('response', (response) => {
      const size = parseInt(response.headers['content-length']) || 0;
      stream.destroy(); // We only want the size, not the actual data
      resolve(size);
    });
    
    stream.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      stream.destroy();
      reject(new Error('Timeout getting stream size'));
    }, 10000);
  });
}

// Download completed file
app.get('/api/download-file/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = downloadSessions.get(sessionId);
  
  if (!session || session.status !== 'completed' || !session.filePath) {
    return res.status(404).json({ error: 'File not ready or not found' });
  }
  
  if (!fs.existsSync(session.filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }
  
  const encodedFilename = encodeURIComponent(session.filename);
  const dispositionHeader = `attachment; filename="${session.filename}"; filename*=UTF-8''${encodedFilename}`;
  
  res.setHeader('Content-Disposition', dispositionHeader);
  res.setHeader('Content-Type', session.filename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
  
  const fileStream = fs.createReadStream(session.filePath);
  fileStream.pipe(res);
  
  fileStream.on('end', () => {
    // Clean up file after download
    setTimeout(() => {
      if (fs.existsSync(session.filePath)) {
        fs.unlinkSync(session.filePath);
      }
      downloadSessions.delete(sessionId);
    }, 1000);
  });
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
