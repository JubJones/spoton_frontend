# SpotOn Person Tracking System

A real-time multi-camera person tracking and analytics system with an intuitive web interface.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed ([Download here](https://nodejs.org/))
- SpotOn backend running on port 3847

### Running the Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173`

That's it! The application will connect to the backend automatically.

## 🎯 Features Overview

SpotOn provides **5 main features** across **4 key pages**:

### 1. **Real-Time Person Tracking** 
- Live video feeds from multiple cameras
- Automatic person detection with bounding boxes
- Cross-camera person identification
- Real-time movement tracking on interactive map

### 2. **Focus Track System**
- Click any person to highlight them across all cameras
- Follow individuals as they move between camera views
- Detailed person information and movement history

### 3. **Interactive Analytics**
- Live person counts per camera
- Traffic flow analysis and heatmaps
- Occupancy trends and peak hour insights
- System performance monitoring

### 4. **Playback Controls**
- Video-like controls (play, pause, seek)
- Historical data analysis
- Timeline navigation with bookmarks

### 5. **Multi-Environment Support**
- Campus environment (4 cameras: c01, c02, c03, c05)
- Factory environment (4 cameras: c09, c12, c13, c16)
- Seamless environment switching

## 📱 How to Use Each Page

### **Landing Page** - Environment Selection
**What you see:** Environment selection cards with camera previews

**How to interact:**
1. **Choose Environment:** Click "Campus" or "Factory" card
2. **Set Time Range:** Use date/time pickers for historical analysis
3. **Start Tracking:** Click "Start Processing" to begin

### **Group View Page** - Main Dashboard  
**What you see:** 2x2 camera grid, interactive map, person list, controls

**How to interact:**
1. **View Live Feeds:** Watch real-time camera feeds with person detection
2. **Track Persons:** 
   - Click any person (bounding box or thumbnail) to focus on them
   - Focused persons are highlighted in **yellow** across all cameras
   - View their path on the interactive map
3. **Control Playback:**
   - Use play/pause buttons for video-like control
   - Drag timeline slider to seek through footage
   - Adjust playback speed (0.5x to 4x)
4. **Navigate Map:**
   - Zoom and pan the map to see person locations
   - Click person markers for details
   - Camera positions shown as icons

### **Analytics Page** - Insights Dashboard
**What you see:** Charts, metrics, and trend analysis

**How to interact:**
1. **View Real-Time Metrics:** Person counts, detection rates, system health
2. **Analyze Trends:** Daily/weekly/monthly traffic patterns
3. **Monitor Performance:** Camera status, processing speed, error rates
4. **Export Data:** Download reports and analytics data

### **Settings Page** - Configuration  
**What you see:** System settings and preferences

**How to interact:**
1. **Adjust Detection:** Confidence thresholds, tracking sensitivity
2. **Customize Display:** Colors, labels, overlay options
3. **Configure Cameras:** Resolution, frame rate, calibration
4. **Manage Users:** Permissions, access control (if enabled)

## 🎮 Key Interactions

### **Person Focus System**
- **Click any person** → Highlights across all cameras
- **Yellow highlighting** → Currently focused person
- **Person thumbnails** → Quick selection below cameras
- **Map markers** → Click for person details

### **Camera Controls**
- **Click camera view** → Expand to fullscreen
- **Mouse wheel** → Zoom in/out on camera feeds
- **Drag** → Pan around zoomed camera view

### **Timeline Navigation**
- **Play button** → Start/resume real-time processing
- **Pause button** → Freeze current frame
- **Timeline slider** → Seek to specific time
- **Speed buttons** → 0.5x, 1x, 2x, 4x playback

### **Map Interaction**
- **Zoom controls** → +/- buttons or mouse wheel
- **Pan** → Click and drag to move around
- **Person markers** → Click for tracking details
- **Camera icons** → Show camera positions and coverage

## 🔧 Technical Details

### Built With
- **React 19** - Modern UI framework
- **TypeScript** - Type safety and better development
- **Vite** - Fast development server and build tool
- **Tailwind CSS** - Utility-first styling
- **WebSocket** - Real-time data communication

### Backend Integration
- **API Endpoint:** `http://localhost:3847`
- **WebSocket:** `ws://localhost:3847`
- **Auto-reconnection** with error recovery
- **Real-time data** at 23 FPS processing rate

### Performance
- **Sub-100ms latency** for real-time tracking
- **Automatic scaling** for different screen sizes
- **Efficient rendering** for smooth 60fps display
- **Smart caching** to minimize bandwidth usage

## 🛠️ Development Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run preview  # Preview production build
npm run lint     # Check code quality
```

## 🔍 Troubleshooting

**No camera feeds?**
- Check that backend is running on port 3847
- Verify environment has available data

**Person tracking not working?**
- Ensure processing task is in "PROCESSING" status
- Check WebSocket connection in browser dev tools

**Slow performance?**
- Try reducing playback speed
- Check system requirements and browser compatibility

---

**Need Help?** Check the console (F12) for detailed error messages and connection status.