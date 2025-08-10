import { useState, useEffect } from 'react'
import dlabLogo from './assets/dlab.png'
import { youtubeService, type VideoInfo, type DownloadOptions, type DownloadProgress } from './services/youtube'
import './App.css'

function App() {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedQuality, setSelectedQuality] = useState('720')
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'mp3'>('mp4')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  
  // Progress tracking state
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [progressInterval, setProgressInterval] = useState<number | null>(null)

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth()
  }, [])

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [progressInterval])

  const checkBackendHealth = async () => {
    const isHealthy = await youtubeService.checkBackendHealth()
    setBackendStatus(isHealthy ? 'online' : 'offline')
  }

  // Start progress tracking
  const startProgressTracking = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    
    const interval = setInterval(async () => {
      try {
        const progress = await youtubeService.getDownloadProgress(sessionId)
        setDownloadProgress(progress)
        
        if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'stopped') {
          clearInterval(interval)
          setProgressInterval(null)
          setIsDownloading(false)
          
          if (progress.status === 'completed') {
            // Auto-download the completed file
            setTimeout(async () => {
              try {
                await youtubeService.downloadCompletedFile(sessionId)
                // Clear progress after successful download
                setTimeout(() => {
                  setDownloadProgress(null)
                  setCurrentSessionId(null)
                }, 3000) // Show success message for 3 seconds
              } catch (error) {
                console.error('Error downloading completed file:', error)
                setError('Failed to download completed file')
              }
            }, 1000)
          } else {
            // For error or stopped status, clear immediately
            setTimeout(() => {
              setDownloadProgress(null)
              setCurrentSessionId(null)
            }, 5000) // Show error message for 5 seconds
          }
        }
      } catch (error) {
        console.error('Error fetching progress:', error)
        clearInterval(interval)
        setProgressInterval(null)
        setError('Failed to track download progress')
      }
    }, 1000)
    
    setProgressInterval(interval)
  }

  // Pause/Resume download
  const togglePauseDownload = async () => {
    if (!currentSessionId) return
    
    try {
      const paused = await youtubeService.pauseDownload(currentSessionId)
      if (downloadProgress) {
        setDownloadProgress({
          ...downloadProgress,
          paused,
          status: paused ? 'paused' : 'downloading'
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause/resume download')
    }
  }

  // Stop download
  const stopDownload = async () => {
    if (!currentSessionId) return
    
    try {
      await youtubeService.stopDownload(currentSessionId)
      if (progressInterval) {
        clearInterval(progressInterval)
        setProgressInterval(null)
      }
      setDownloadProgress(null)
      setCurrentSessionId(null)
      setIsDownloading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop download')
    }
  }

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleGetVideoInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }
    
    if (backendStatus === 'offline') {
      setError('Backend server is not running. Please start the backend server first.')
      return
    }
    
    setIsLoading(true)
    setError(null)
    setVideoInfo(null)
    
    try {
      const info = await youtubeService.getVideoInfo(url)
      console.log('Received video info:', info); // Debug log
      if (info) {
        setVideoInfo(info)
        console.log('Available qualities:', info.availableQualities); // Debug log
        // Set default quality to first available quality (without 'p')
        if (info.availableQualities.length > 0) {
          const firstQuality = info.availableQualities[0];
          const qualityValue = firstQuality.replace('p', '');
          console.log('Setting default quality to:', qualityValue); // Debug log
          setSelectedQuality(qualityValue);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get video information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!videoInfo || !url) return
    
    setIsDownloading(true)
    setError(null)
    setDownloadProgress(null)
    setCurrentSessionId(null)
    
    try {
      const downloadOptions: DownloadOptions = {
        quality: selectedQuality,
        format: selectedFormat
      }
      
      console.log('Download options:', downloadOptions);
      console.log('URL:', url);
      
      // Start download with progress tracking
      const sessionId = await youtubeService.startDownloadWithProgress(url, downloadOptions)
      startProgressTracking(sessionId)
      
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download video')
      setIsDownloading(false)
    }
  }

  const resetForm = () => {
    setUrl('')
    setVideoInfo(null)
    setError(null)
    
    // Stop any ongoing download
    if (currentSessionId) {
      stopDownload()
    }
    
    // Clear progress tracking
    if (progressInterval) {
      clearInterval(progressInterval)
      setProgressInterval(null)
    }
    setDownloadProgress(null)
    setCurrentSessionId(null)
    setIsDownloading(false)
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)' }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-8xl font-bold text-amber-100" style={{
              marginTop: '3rem',
              color: '#DFD0B8',
              fontFamily: 'Abril Fatface, serif'
            }}>DLab</h1>
            <img src={dlabLogo} alt="DLab Logo" className="w-24 h-24" style={{
              marginTop: '3rem',
              color: '#DFD0B8'
            }} />
          </div>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-8">
          <h2 className="text-2xl text-amber-100 font-light" style={{
            marginBottom: '4rem',
            fontSize: '1.8rem',
            fontFamily: 'Alice',
            color: '#DFD0B8'
          }}>Download Youtube Videos For Free</h2>
        </div>

        {/* Backend Status */}
        {/* <div className="flex justify-center mb-6">
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            backendStatus === 'online' 
              ? 'bg-green-600 text-white' 
              : backendStatus === 'offline'
              ? 'bg-red-600 text-white'
              : 'bg-yellow-600 text-white'
          }`}>
            {backendStatus === 'online' && '🟢 Backend Online'}
            {backendStatus === 'offline' && '🔴 Backend Offline - Start the backend server'}
            {backendStatus === 'checking' && '🟡 Checking backend...'}
          </div>
        </div> */}

        {/* Input Section */}
        <div className="flex justify-center mb-8" style={{
          marginBottom: '3.5rem'
        }}>
          <div className="flex w-full max-w-4xl">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGetVideoInfo()}
              placeholder="Paste youtube video link here"
              className="flex-1 px-6 py-4 text-lg bg-gray-600 text-white rounded-l-lg border-none outline-none focus:outline-none"
              style={{
                backgroundColor: 'rgba(223, 208, 184, 0.6)', // Reduced opacity
                color: '#393E46'
              }}
              // Remove focus:ring-2 and focus:ring-blue-500 to prevent highlight
            />
            <button
              onClick={handleGetVideoInfo}
              disabled={isLoading}
              className="px-8 py-4 bg-gray-700 text-[#DFD0B8] text-2xl rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#393E46]"
              style={{
              fontFamily: 'Alice',
              fontSize: '1rem' 
              }}
            >
              {isLoading ? 'Loading...' : 'Download'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex justify-center mb-8">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg max-w-2xl w-full text-center">
              {error}
              <button 
                onClick={() => setError(null)} 
                className="ml-4 text-red-200 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Video Preview Section */}
        {videoInfo && (
          <div className="flex justify-center mb-12">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
              {/* Debug Info
              <div className="mb-4 p-2 bg-gray-700 rounded text-xs text-gray-300">
                <strong>Debug:</strong> Available qualities: {JSON.stringify(videoInfo.availableQualities)} 
                (Count: {videoInfo.availableQualities.length})
              </div> */}
              
              <div className="flex gap-6 flex-col md:flex-row">
                {/* Video Thumbnail */}
                <div className="flex-shrink-0">
                  <div className="w-full md:w-64 h-36 bg-gray-700 rounded-lg overflow-hidden">
                    {videoInfo.thumbnail ? (
                      <img 
                        src={videoInfo.thumbnail} 
                        alt={videoInfo.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to custom design if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full bg-gradient-to-r from-amber-900 to-amber-700 flex items-center justify-center text-white text-lg font-bold">
                              ALL DAY VIBES<br/>Lofi Music
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-amber-900 to-amber-700 flex items-center justify-center text-white text-lg font-bold">
                        ALL DAY VIBES<br/>Lofi Music
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Info */}
                <div className="flex-1">
                  <h3 className="text-xl text-[#DFD0B8] mb-2 line-clamp-2">{videoInfo.title}</h3>
                  <p className="text-gray-400 mb-6">{videoInfo.duration}</p>

                  {/* Download Options */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading || Boolean(downloadProgress && downloadProgress.status !== 'completed' && downloadProgress.status !== 'error' && downloadProgress.status !== 'stopped')}
                      className="px-6 py-2 bg-gray-600 hover:bg-[#393E46] text-[#DFD0B8] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? 'Starting...' : 
                       downloadProgress && downloadProgress.status === 'downloading' ? 'Downloading...' :
                       downloadProgress && downloadProgress.status === 'paused' ? 'Paused' :
                       'Download'}
                    </button>
                    
                    {/* <button
                      onClick={handleGetVideoInfo}
                      disabled={isLoading}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors text-sm"
                    >
                      Refresh Info
                    </button> */}
                    
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as 'mp4' | 'mp3')}
                      className="pl-1 pr-1 py-2 bg-gray-600 text-[#DFD0B8] rounded border-none outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mp4">MP4</option>
                      <option value="mp3">MP3</option>
                    </select>
                    
                    {selectedFormat === 'mp4' && (
                      <select
                        value={selectedQuality}
                        onChange={(e) => setSelectedQuality(e.target.value)}
                        className="pl-1 pr-1 py-2 bg-gray-600 text-[#DFD0B8] rounded border-none outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {videoInfo.availableQualities.map(quality => {
                          const qualityValue = quality.replace('p', '');
                          console.log(`Rendering quality option: ${quality} -> value: ${qualityValue}`); 
                          return (
                            <option key={quality} value={qualityValue}>{quality}</option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {/* Quality Warning */}
                  {/* {videoInfo.qualityNote && (
                    <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded text-yellow-200 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Quality Notice:</span>
                      </div>
                      <p className="mt-1">{videoInfo.qualityNote}</p>
                    </div>
                  )} */}

                  {/* Reset Button */}
                  <div className="mt-4">
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-white text-sm underline"
                    >
                      Download another video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Progress Section */}
        {downloadProgress && (
          <div className="flex justify-center mb-8" style={{ marginBottom: '2rem' }}>
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl shadow-lg border border-gray-700">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg text-[#DFD0B8] font-semibold">
                    {downloadProgress.status === 'starting' && 'Initializing download...'}
                    {downloadProgress.status === 'fetching_info' && 'Getting video information...'}
                    {downloadProgress.status === 'downloading' && !downloadProgress.paused && 'Downloading...'}
                    {downloadProgress.status === 'merging' && 'Merging video and audio...'}
                    {downloadProgress.status === 'paused' && 'Download paused'}
                    {downloadProgress.status === 'completed' && 'Download completed!'}
                    {downloadProgress.status === 'error' && 'Download failed'}
                    {downloadProgress.status === 'stopped' && 'Download stopped'}
                  </h3>
                  <span className="text-[#DFD0B8] text-sm font-mono">
                    {Math.min(downloadProgress.progress, 100)}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-4 mb-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-600 to-amber-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${Math.min(Math.max(downloadProgress.progress, 0), 100)}%`,
                      maxWidth: '100%'
                    }}
                  ></div>
                </div>
                
                {/* Download Info */}
                <div className="flex justify-between items-center text-sm text-gray-400 mb-4 flex-wrap gap-2">
                  <span className="truncate max-w-xs">
                    {downloadProgress.filename && `File: ${downloadProgress.filename}`}
                  </span>
                  <span className="whitespace-nowrap">
                    {downloadProgress.status === 'downloading' && downloadProgress.downloaded > 0 && downloadProgress.total > 0 && (
                      `${formatBytes(downloadProgress.downloaded)} / ${formatBytes(downloadProgress.total)}`
                    )}
                    {downloadProgress.status === 'downloading' && downloadProgress.downloaded > 0 && downloadProgress.total === 0 && (
                      `Downloaded: ${formatBytes(downloadProgress.downloaded)}`
                    )}
                    {downloadProgress.status === 'merging' && 'Processing final video...'}
                  </span>
                </div>
                
                {/* Control Buttons */}
                <div className="flex gap-3">
                  {(downloadProgress.status === 'downloading' || downloadProgress.status === 'paused') && (
                    <>
                      <button
                        onClick={togglePauseDownload}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                      >
                        {downloadProgress.paused ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        onClick={stopDownload}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Stop
                      </button>
                    </>
                  )}
                  
                  {downloadProgress.status === 'merging' && (
                    <div className="text-amber-400 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Merging video and audio... Please wait.
                    </div>
                  )}
                  
                  {downloadProgress.status === 'completed' && (
                    <div className="text-green-400 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      File ready for download! Check your Downloads folder.
                    </div>
                  )}
                  
                  {downloadProgress.status === 'error' && (
                    <div className="text-red-400 text-sm">
                      Error: {downloadProgress.error || 'Unknown error occurred'}
                    </div>
                  )}
                  
                  {downloadProgress.status === 'stopped' && (
                    <div className="text-yellow-400 text-sm">
                      Download was stopped by user
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description Section */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <p className="text-gray-300 text-lg leading-relaxed mb-6" style={{
              color: '#DFD0B8',
              textAlign: 'left',
              fontFamily: 'Alice'
            }}>
              In today's fast-paced digital world, offline access to YouTube content is more important 
              than ever. Whether you're catching up on your favorite creators during a commute, 
              watching music videos without Wi-Fi, or saving tutorials for future reference, having 
              videos at your fingertips—anytime, anywhere—is essential.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed" style={{
              color: '#DFD0B8',
              textAlign: 'left',
              fontFamily: 'Alice'
            }}>
              DLab makes it easy. Our free, no-frills downloader converts YouTube links into MP4 files in 
              seconds. No sign-ups, no clutter—just a simple way to keep your favorite content accessible 
              whenever you need it.
            </p>
          </div>

            {/* Footer */}
            <div className="text-gray-500 text-sm mt-16 mb-2 fixed bottom-0 left-0 w-full text-center bg-transparent pointer-events-none select-none">
            Developed By Lance Antor
            </div>
        </div>
      </div>
    </div>
  )
}

export default App
