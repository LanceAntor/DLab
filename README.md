# DLab

DLab is a comprehensive full-stack YouTube downloader application featuring a modern React frontend and robust Node.js backend. Built for seamless video downloading with an intuitive user interface and powerful server-side processing capabilities.

## Visual Demo

### Home Screen
![Home Screen Screenshot](src/assets/screenshot/menu.png)
*DLab home screen with download options and user interface*

### Download Interface
![Download Interface Screenshot](src/assets/screenshot/download.png)
*Active download interface showing progress and options*

## Features

- **Full-Stack Architecture**: Complete frontend and backend integration with seamless communication
- **YouTube Integration**: Download videos from YouTube with various quality options
- **Real-time Progress**: Live download progress tracking with visual feedback
- **Modern UI**: Clean, responsive React interface with intuitive controls
- **Batch Processing**: Handle multiple downloads efficiently
- **Format Options**: Support for multiple video and audio formats
- **Cross-Platform**: Compatible with Windows, macOS, and Linux
- **One-Click Launcher**: Easy startup script for both servers

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/DLab.git
cd DLab

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

## Quick Start

### Windows Users
Simply run the launcher script:
```cmd
start-dlab.bat
```
This will automatically start both frontend and backend servers.

### Manual Start
```bash
# Start backend server (in one terminal)
cd backend
node server.js

# Start frontend development server (in another terminal)
npm run dev
```

## Usage

- **Start Application**: Run `start-dlab.bat` or manually start both servers
- **Access Interface**: Navigate to `http://localhost:5173` in your browser
- **Download Videos**: Paste YouTube URLs and select your preferred format/quality
- **Monitor Progress**: Track download status in real-time
- **Manage Files**: Access downloaded content through the application interface

## Project Structure

```
DLab/
├── backend/                 # Node.js Express server
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── assets/            # Images, icons, etc.
│   └── ...
├── start-dlab.bat         # Windows launcher script
├── package.json           # Frontend dependencies
└── README.md              # This file
```

## Built With

- ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
- ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
- ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
- ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
- ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
- ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## Server Configuration

- **Frontend Server**: Runs on `http://localhost:5173` (Vite development server)
- **Backend Server**: Runs on `http://localhost:3001` (Express.js API server)
- **Auto-Launch**: Both servers start automatically with the launcher script

## Acknowledgements

- **[YouTube-DL](https://youtube-dl.org/)**: Core video downloading functionality
- **[Express.js](https://expressjs.com/)**: Fast, unopinionated web framework for Node.js
- **[Vite](https://vitejs.dev/)**: Next generation frontend tooling
- **[React](https://reactjs.org/)**: A JavaScript library for building user interfaces
- **[Node.js](https://nodejs.org/)**: JavaScript runtime for server-side development
- **Open Source Libraries**: Various JavaScript and TypeScript utilities for enhanced functionality

## Development

```bash
# Frontend development
npm run dev

# Backend development
cd backend
npm run dev

# Build for production
npm run build
```

---

&copy; 2025 DLab. All rights reserved.
