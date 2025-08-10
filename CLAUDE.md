# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server (typically http://localhost:5173)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on codebase
- `npm run preview` - Preview production build locally

### Development Workflow
- Use `npm run dev` for hot-reloading development
- Run `npm run lint` before committing to catch issues
- Use `npm run build` to verify production build works

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Package Manager**: npm

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── ImageSequencePlayer.tsx  # Video frame sequence player with bounding box overlays
│   └── SingleVideoPlayer.tsx    # Individual video player component
├── pages/               # Route-based page components
│   ├── GroupViewPage.tsx        # Main dashboard with camera grid and tracking
│   └── SelectZonePage.tsx       # Zone selection interface
├── types/               # TypeScript type definitions
│   └── trackingData.ts          # Tracking data interfaces
└── App.tsx             # Main app with routing
```

### Key Application Concepts

#### Multi-Camera Person Tracking System
This is a frontend for a real-time person tracking system that:
- Displays multiple camera feeds simultaneously
- Overlays bounding boxes on detected persons
- Shows tracking data on a map visualization
- Processes frame sequences with tracking metadata

#### Data Flow Architecture
- **Frame Data**: JSON files contain tracking data per frame (coords, bounding boxes, IDs)
- **Camera Mapping**: App camera IDs (camera1-4) map to JSON camera IDs (c09, c12, c13, c16)
- **Real-time Updates**: Frame advancement simulates real-time tracking at 1 FPS
- **Coordinate Systems**: Multiple coordinate systems (image coords, map coords, display coords)

#### Component Architecture
- **ImageSequencePlayer**: Handles frame sequences, bounding box overlays, coordinate transformations
- **GroupViewPage**: Main dashboard with camera grid, map visualization, and controls
- **Coordinate Scaling**: Dynamic scaling between original image coords (1920x1080) and display dimensions

### Backend Integration
- Expected backend API: `http://localhost:8000`
- Expected WebSocket: `ws://localhost:8000`
- Frame data served from `/coords/scene_[id]/` directory
- Camera frame images served from `/frames/camera[n]/` directories

### Configuration Files
- `vite.config.ts` - Vite configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration

### Development Notes
- Uses ES modules (`"type": "module"` in package.json)
- Frame sequence player handles dynamic image loading and coordinate transformations
- Map visualization uses 2x2 grid layout for camera-specific tracking points
- Tracking data includes global IDs for cross-camera person identification