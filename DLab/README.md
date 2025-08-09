# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# DLab - YouTube Video Downloader

A modern, React-based YouTube video downloader with a clean, dark-themed interface.

## Features

- ✨ Modern, responsive design matching the provided mockups
- 🎥 YouTube URL validation and video information extraction
- 📱 Mobile-friendly interface
- 🎚️ Multiple quality options (360p, 480p, 720p, 1080p)
- 📄 Support for MP4 and MP3 formats
- 🔄 Loading states and error handling
- 🎨 Tailwind CSS for styling

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Linting**: ESLint

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd DLab
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Backend Integration

**Important**: This frontend application includes mock services for demonstration purposes. To make it fully functional, you'll need to implement a backend service that can:

### Required Backend Endpoints

1. **Get Video Information**
   - `POST /api/video-info`
   - Body: `{ "url": "youtube-url" }`
   - Response: Video metadata including title, duration, thumbnail, available qualities

2. **Download Video**
   - `POST /api/download`
   - Body: `{ "videoId": "string", "quality": "720", "format": "mp4" }`
   - Response: Download URL or stream

### Recommended Backend Technologies

- **Python**: `yt-dlp` library with Flask/FastAPI
- **Node.js**: `ytdl-core` with Express
- **PHP**: `youtube-dl` with Laravel/Slim

### Example Backend Implementation (Python + Flask)

```python
from flask import Flask, request, jsonify
import yt_dlp
import os

app = Flask(__name__)

@app.route('/api/video-info', methods=['POST'])
def get_video_info():
    url = request.json.get('url')
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return jsonify({
                'title': info.get('title'),
                'duration': info.get('duration_string'),
                'thumbnail': info.get('thumbnail'),
                'videoId': info.get('id'),
                'availableQualities': ['360', '480', '720', '1080']
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 400

@app.route('/api/download', methods=['POST'])
def download_video():
    video_id = request.json.get('videoId')
    quality = request.json.get('quality')
    format_type = request.json.get('format')
    
    # Implementation for video download
    # Return download URL or initiate download
    
if __name__ == '__main__':
    app.run(debug=True)
```

## Legal Considerations

⚠️ **Important**: This tool is for educational purposes and personal use only. Please ensure you comply with:

- YouTube's Terms of Service
- Copyright laws in your jurisdiction
- Fair use policies
- Creator's content usage rights

## Project Structure

```
src/
├── components/          # React components
├── services/           # API and business logic
│   └── youtube.ts     # YouTube service (mock implementation)
├── assets/            # Static assets
├── App.tsx           # Main application component
├── main.tsx          # Application entry point
└── index.css         # Global styles with Tailwind
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Customization

### Styling
The application uses Tailwind CSS. You can modify the design by updating the classes in the components or by adding custom CSS.

### Functionality
The YouTube service is located in `src/services/youtube.ts`. Replace the mock implementation with actual API calls to your backend.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is for educational purposes. Please respect copyright laws and YouTube's Terms of Service.

## Support

If you encounter any issues or have questions, please open an issue in the repository.

---

**Developed By Lance Antor**

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
