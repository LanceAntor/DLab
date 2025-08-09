# DLab Backend - 500 Error Fix

## 🔧 Issues Fixed

The 500 Internal Server Error has been resolved with the following improvements:

### ✅ Updated Dependencies
- **Replaced** `ytdl-core` with `@distube/ytdl-core` (more reliable and updated)
- **Added** better error handling and timeout protection
- **Added** detailed logging for debugging

### ✅ Enhanced Error Handling
- Specific error messages for different failure types
- Timeout protection (30 seconds max)
- Fallback quality options if detection fails
- Better input validation

### ✅ Improved Debugging
- Detailed console logging
- Development error details
- Debug mode startup script

## 🚀 How to Fix the 500 Error

### Step 1: Reinstall Backend Dependencies
```bash
double-click: install-backend.bat
```
This will:
- Remove old dependencies
- Install updated packages
- Use the more reliable @distube/ytdl-core library

### Step 2: Start Backend in Debug Mode
```bash
double-click: start-backend-debug.bat
```
This will show detailed logs to help identify issues.

### Step 3: Test the Backend
```bash
cd backend
npm run test
```
This will test the backend with a known working YouTube URL.

## 🔍 Common Causes of 500 Errors

### 1. **Outdated ytdl-core Library**
- **Problem**: Original ytdl-core often breaks with YouTube changes
- **Solution**: Now using @distube/ytdl-core (more maintained)

### 2. **Age-Restricted or Private Videos**
- **Problem**: Some videos can't be accessed
- **Solution**: Better error messages now explain the issue

### 3. **Network Timeouts**
- **Problem**: Slow connections causing timeouts
- **Solution**: Added 30-second timeout with proper error handling

### 4. **Invalid Video URLs**
- **Problem**: Malformed or unsupported URLs
- **Solution**: Enhanced URL validation before processing

## 📝 Testing Steps

### Test with These URLs:
1. **Rick Roll (Always works)**: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. **Short URL**: `https://youtu.be/dQw4w9WgXcQ`
3. **Any public, non-restricted video**

### Expected Behavior:
1. Backend shows detailed logs
2. Frontend receives real video title and duration
3. No 500 errors in browser console

## 🐛 If Errors Persist

### Check Backend Logs:
Look for these in the console:
- `Received request for URL: [url]`
- `Extracted video ID: [id]`
- `Video info retrieved successfully`

### Common Error Messages:
- **"Video unavailable"** → Video is private/deleted
- **"Request timeout"** → Network issue, try again
- **"Age-restricted"** → Video requires sign-in
- **"Invalid YouTube URL"** → Check URL format

### Debug Commands:
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Test video info endpoint
curl -X POST http://localhost:3001/api/video-info -H "Content-Type: application/json" -d "{\"url\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}"
```

## ✅ Success Indicators

When everything works correctly:
- ✅ Backend shows: `🚀 DLab backend server running on http://localhost:3001`
- ✅ Frontend shows: `🟢 Backend Online`
- ✅ Real video titles appear when you paste URLs
- ✅ Downloads work without errors

## 📞 Need More Help?

If you're still getting 500 errors:
1. Run `start-backend-debug.bat`
2. Copy the exact error message from the console
3. Try with the test URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
4. Check if your internet connection can access YouTube

The updated backend should now handle most YouTube URLs reliably!
