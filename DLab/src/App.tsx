import { useState } from 'react'
import dlabLogo from './assets/dlab.png'
import { youtubeService, type VideoInfo, type DownloadOptions } from './services/youtube'
import './App.css'

function App() {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedQuality, setSelectedQuality] = useState('720')
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'mp3'>('mp4')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleGetVideoInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }
    
    setIsLoading(true)
    setError(null)
    setVideoInfo(null)
    
    try {
      const info = await youtubeService.getVideoInfo(url)
      setVideoInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get video information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!videoInfo) return
    
    setIsDownloading(true)
    
    try {
      const downloadOptions: DownloadOptions = {
        quality: selectedQuality,
        format: selectedFormat
      }
      
      const downloadId = await youtubeService.downloadVideo(videoInfo.videoId, downloadOptions)
      
      // In a real app, you would handle the download differently
      alert(`Download started! Download ID: ${downloadId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start download')
    } finally {
      setIsDownloading(false)
    }
  }

  const resetForm = () => {
    setUrl('')
    setVideoInfo(null)
    setError(null)
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
            <h1 className="text-6xl font-bold text-amber-100">DLab</h1>
            <img src={dlabLogo} alt="DLab Logo" className="w-16 h-16" />
          </div>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-12">
          <h2 className="text-2xl text-amber-100 font-light">Download Youtube Videos For Free</h2>
        </div>

        {/* Input Section */}
        <div className="flex justify-center mb-8">
          <div className="flex w-full max-w-2xl">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGetVideoInfo()}
              placeholder="Paste youtube video link here"
              className="flex-1 px-6 py-4 text-lg bg-gray-600 text-white placeholder-gray-300 rounded-l-lg border-none outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGetVideoInfo}
              disabled={isLoading}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <h3 className="text-xl text-white mb-2 line-clamp-2">{videoInfo.title}</h3>
                  <p className="text-gray-400 mb-6">{videoInfo.duration}</p>

                  {/* Download Options */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? 'Starting...' : 'Download'}
                    </button>
                    
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as 'mp4' | 'mp3')}
                      className="px-3 py-2 bg-gray-600 text-white rounded border-none outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mp4">MP4</option>
                      <option value="mp3">MP3</option>
                    </select>
                    
                    <select
                      value={selectedQuality}
                      onChange={(e) => setSelectedQuality(e.target.value)}
                      className="px-3 py-2 bg-gray-600 text-white rounded border-none outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={selectedFormat === 'mp3'}
                    >
                      {videoInfo.availableQualities.map(quality => (
                        <option key={quality} value={quality}>{quality}p</option>
                      ))}
                    </select>
                  </div>

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

        {/* Description Section */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              In today's fast-paced digital world, offline access to YouTube content is more important 
              than ever. Whether you're catching up on your favorite creators during a commute, 
              watching music videos without Wi-Fi, or saving tutorials for future reference, having 
              videos at your fingertips—anytime, anywhere—is essential.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              DLab makes it easy. Our free, no-frills downloader converts YouTube links into MP4 files in 
              seconds. No sign-ups, no clutter—just a simple way to keep your favorite content accessible 
              whenever you need it.
            </p>
          </div>

          {/* Footer */}
          <div className="text-gray-500 text-sm">
            Developed By Lance Antor
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
