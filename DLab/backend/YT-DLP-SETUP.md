# DLab Backend - yt-dlp Fallback Setup

## Overview

DLab now includes an automatic fallback system using `yt-dlp` when YouTube's anti-bot measures block the primary `ytdl-core` library. This significantly improves download reliability.

## yt-dlp Installation (Required for Fallback)

### Option 1: Using pip (Recommended)
```powershell
# If you have Python installed
pip install -U yt-dlp

# Or using Python module
python -m pip install -U yt-dlp
```

### Option 2: Using Package Managers

**With Scoop:**
```powershell
scoop install yt-dlp
```

**With winget:**
```powershell
winget install -e --id yt-dlp.yt-dlp
```

### Option 3: Standalone Binary
1. Download `yt-dlp.exe` from: https://github.com/yt-dlp/yt-dlp/releases/latest
2. Place it in your system PATH or in the backend directory
3. Rename to `yt-dlp.exe` if needed

## Verification

After installation, verify yt-dlp works:
```powershell
yt-dlp --version
```

You should see version information if installed correctly.

## How It Works

1. **Primary Method**: DLab tries to download using `ytdl-core` first
2. **Automatic Fallback**: If YouTube anti-bot errors are detected, it automatically switches to `yt-dlp`
3. **Seamless Experience**: Users don't need to do anything - the fallback happens automatically

## Checking Status

- **API Endpoint**: `GET /api/config` - Shows if yt-dlp is available and configured
- **Frontend**: The app will show fallback status in the UI
- **Logs**: Server logs will indicate when fallback is used

## Configuration

The fallback system can be configured in `server.js`:

```javascript
const downloadConfig = {
  useYtDlpFallback: true,        // Enable/disable fallback
  ytDlpPath: 'yt-dlp',           // Path to yt-dlp binary
  maxYtdlCoreRetries: 2,         // Retries before fallback
  fallbackTimeout: 300000,       // 5 minutes timeout
};
```

## API Endpoints

- `GET /api/config` - Check yt-dlp availability and config
- `POST /api/config/fallback` - Enable/disable fallback
- `GET /api/youtube-status` - Current YouTube service status
- `GET /api/youtube-health` - Health overview

## Troubleshooting

### "yt-dlp not found" Error
1. Ensure yt-dlp is installed (see installation options above)
2. Check it's in your PATH: `where yt-dlp` (Windows) or `which yt-dlp` (Linux/Mac)
3. If using standalone binary, place it in the backend directory

### Downloads Still Failing
1. Check `/api/config` to verify yt-dlp is detected
2. Look at server logs for specific error messages
3. Try different videos (some may be geo-blocked or restricted)
4. Ensure the video URL is valid and public

### Performance
- yt-dlp downloads are typically slower than ytdl-core but more reliable
- The system will automatically use the fastest method that works
- First-time use may be slower as yt-dlp initializes

## Benefits of yt-dlp Fallback

- **Higher Success Rate**: Works when ytdl-core is blocked by YouTube
- **Active Maintenance**: yt-dlp is actively updated for YouTube changes
- **Better Error Handling**: More descriptive error messages
- **Format Support**: Supports more video/audio formats
- **Automatic**: No user intervention required

## Common Error Messages and Solutions

| Error | Solution |
|-------|----------|
| "parsing watch.html" | Automatic fallback to yt-dlp |
| "Could not extract functions" | Automatic fallback to yt-dlp |
| "yt-dlp not found" | Install yt-dlp (see above) |
| "Both ytdl-core and yt-dlp failed" | Video may be restricted/unavailable |

## Manual Testing

Test yt-dlp directly:
```powershell
# Test download (will not actually download due to --simulate)
yt-dlp --simulate "https://www.youtube.com/watch?v=VIDEO_ID"

# Check available formats
yt-dlp -F "https://www.youtube.com/watch?v=VIDEO_ID"
```