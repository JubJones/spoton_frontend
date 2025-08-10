# SpotOn System - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [System Overview](#system-overview)
3. [Environment Selection](#environment-selection)
4. [Main Dashboard](#main-dashboard)
5. [Person Tracking](#person-tracking)
6. [Analytics](#analytics)
7. [Settings](#settings)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Internet Connection**: Stable broadband connection required for real-time streaming
- **Display Resolution**: Minimum 1280x720, recommended 1920x1080 or higher
- **Hardware**: Modern computer with at least 4GB RAM

### First-Time Login
1. Open your web browser and navigate to the SpotOn application URL
2. You will be greeted with the SpotOn landing page
3. If authentication is required, enter your credentials provided by your administrator
4. The system will perform a health check to ensure backend connectivity

## System Overview

SpotOn is an intelligent person tracking and analytics system that provides real-time visualization of people movement across multiple camera zones. The system consists of several key areas:

### Main Navigation
- **Environment Selection**: Choose between different monitoring locations
- **Dashboard**: Real-time tracking visualization
- **Analytics**: Historical data analysis and reporting
- **Settings**: System configuration and preferences

### Key Concepts
- **Person Detection**: AI-powered identification of individuals in camera feeds
- **Cross-Camera Tracking**: Following the same person as they move between different camera zones
- **Global ID**: Unique identifier assigned to each person across all cameras
- **Bounding Box**: Visual rectangle highlighting detected persons
- **Map Visualization**: Spatial representation of person positions and movements

## Environment Selection

### Choosing Your Environment
When you first access the system, you'll need to select an environment to monitor:

#### Campus Environment
- **Description**: University or corporate campus monitoring
- **Cameras**: 4 cameras covering main walkways and entrances
- **Typical Use Cases**: 
  - Student flow analysis
  - Security monitoring
  - Occupancy tracking

#### Factory Environment  
- **Description**: Industrial facility monitoring
- **Cameras**: 4 cameras covering production areas and exits
- **Typical Use Cases**:
  - Worker safety monitoring
  - Workflow optimization
  - Compliance tracking

### Date and Time Selection
1. **Select Date Range**: Choose the specific date you want to analyze
   - Use the calendar interface to select start and end dates
   - Available date ranges depend on your data retention policies
   
2. **Time Range Selection**: Narrow down to specific hours
   - Use time sliders to select hour ranges
   - Default shows full day (00:00 - 23:59)

3. **Quick Presets**: Use preset options for common time ranges
   - Today
   - Yesterday  
   - Last 7 days
   - Last 30 days
   - Custom range

### Starting Monitoring
1. After selecting environment and time parameters, click "Start Tracking"
2. The system will initialize the processing task
3. You'll see a progress indicator while the system prepares data
4. Once ready, you'll be directed to the main dashboard

## Main Dashboard

The main dashboard is your primary interface for real-time person tracking. It consists of several key sections:

### Camera Grid (Top Section)
The camera grid shows live feeds from all active cameras in a 2x2 layout:

#### Camera Views
- **Live Feed**: Real-time video stream from each camera
- **Person Overlays**: Colored bounding boxes around detected persons
- **Person IDs**: Unique identifiers displayed above each bounding box
- **Confidence Scores**: Detection accuracy percentages (optional display)

#### Camera Controls
- **Full Screen**: Click the expand icon to view a single camera in full screen
- **Camera Labels**: Each camera is clearly labeled (Camera 1, Camera 2, etc.)
- **Status Indicators**: Green dot indicates active camera, red indicates issues

#### Person Selection
- **Click to Select**: Click on any bounding box to select a person
- **Cross-Camera Highlighting**: Selected persons are highlighted across all cameras
- **Multi-Selection**: Hold Ctrl/Cmd to select multiple persons

### Person Thumbnails (Below Camera Grid)
- **Cropped Images**: Thumbnails showing detected persons from each camera
- **Click to Focus**: Click any thumbnail to select that person
- **Confidence Scores**: Displayed below each thumbnail
- **Global IDs**: Unique identifiers for cross-camera tracking

### Map Visualization (Right Side)
#### Interactive Map
- **Environment Layout**: Overhead view of your selected environment
- **Camera Positions**: Fixed icons showing camera locations
- **Person Markers**: Real-time position indicators for tracked persons
- **Color Coordination**: Person colors match camera view highlights

#### Map Controls
- **Zoom**: Use mouse wheel or +/- buttons to zoom in/out
- **Pan**: Click and drag to move around the map
- **Reset View**: Button to return to default zoom and position

#### Person Paths
- **Historical Trails**: Dotted lines showing person movement history
- **Time-based Filtering**: Show paths for last N minutes
- **Path Animation**: Animated playback of person movements

### Person Details Panel (Bottom Right)
When a person is selected, this panel shows detailed information:

#### Basic Information
- **Person ID**: Unique identifier
- **First Detected**: When the person first appeared
- **Last Seen**: Most recent detection time
- **Total Duration**: How long person has been tracked
- **Current Status**: Active, inactive, or lost tracking

#### Movement Analysis
- **Path Summary**: Distance traveled and areas visited
- **Dwell Time**: Time spent in specific zones
- **Speed Analysis**: Movement patterns and velocity
- **Camera Transitions**: History of movement between camera zones

### Playback Controls (Bottom Center)
#### Transport Controls
- **Play/Pause**: Start or stop real-time updates
- **Speed Control**: Adjust playback speed (0.5x, 1x, 2x, 4x)
- **Frame Step**: Move forward/backward frame by frame
- **Jump to Time**: Navigate to specific timestamps

#### Timeline
- **Scrub Bar**: Visual timeline with playback position indicator
- **Event Markers**: Notable events marked on timeline
- **Zoom Controls**: Zoom in/out on timeline for detailed navigation
- **Bookmarks**: Save important moments for quick access

## Person Tracking

### Understanding Person Detection
The SpotOn system uses advanced AI algorithms to detect and track individuals:

#### Detection Process
1. **Image Analysis**: Each camera frame is analyzed for human shapes
2. **Bounding Box Creation**: Rectangles drawn around detected persons
3. **Confidence Scoring**: Algorithm assigns confidence level (0-100%)
4. **Feature Extraction**: Unique visual characteristics captured

#### Cross-Camera Re-identification
1. **Feature Matching**: System compares visual features between cameras
2. **Global ID Assignment**: Same person receives consistent ID across cameras
3. **Path Reconstruction**: Movement history built across camera zones
4. **Confidence Tracking**: System tracks certainty of person matches

### Working with Person Selection

#### Single Person Selection
1. **Click Bounding Box**: Click on any person's bounding box in camera view
2. **Use Thumbnail**: Click person thumbnail below camera grid
3. **Map Selection**: Click person marker on map visualization
4. **Search Function**: Use person ID search if available

#### Visual Feedback
- **Highlighted Bounding Boxes**: Selected person highlighted in all camera views
- **Map Marker Emphasis**: Selected person's map marker enlarged/highlighted
- **Detail Panel Update**: Person information panel shows selected person's data
- **Cross-Reference Lines**: Optional lines connecting same person across views

#### Multiple Person Selection
1. **Hold Modifier Key**: Hold Ctrl (Windows) or Cmd (Mac)
2. **Click Additional Persons**: Add more persons to selection
3. **Selection Counter**: Number of selected persons shown in UI
4. **Batch Operations**: Perform actions on all selected persons

### Focus Track Feature

#### Activating Focus Mode
1. Select one or more persons using methods above
2. Click "Focus Track" button in control panel
3. System enters focused tracking mode

#### Focus Mode Benefits
- **Highlighted Tracking**: Selected persons remain prominently highlighted
- **Dimmed Distractions**: Non-selected persons shown with reduced opacity
- **Enhanced Details**: More detailed information displayed for focused persons
- **Priority Processing**: System prioritizes tracking quality for selected persons

#### Focus Mode Controls
- **Follow Mode**: Automatically switch camera views to follow person
- **Lock Mode**: Keep focus on selected persons even if they leave frame
- **Alert Mode**: Notifications when focused persons enter/exit zones
- **Export Mode**: Save focused tracking data for analysis

### Tracking Quality Indicators

#### Confidence Levels
- **High Confidence (80-100%)**: Green bounding box, reliable tracking
- **Medium Confidence (60-79%)**: Yellow bounding box, generally reliable
- **Low Confidence (40-59%)**: Orange bounding box, may have issues
- **Very Low Confidence (<40%)**: Red bounding box, unreliable tracking

#### Common Tracking Challenges
- **Occlusion**: Person partially hidden behind objects
- **Poor Lighting**: Low light conditions affecting detection
- **Distance**: Person too far from camera for reliable detection
- **Movement Blur**: Rapid movement causing blurred images
- **Similar Appearance**: Multiple people with similar clothing/appearance

## Analytics

### Analytics Dashboard Overview
The analytics section provides comprehensive insights into tracking data:

#### Real-Time Metrics
- **Current Person Count**: Number of people currently detected
- **Detection Rate**: Successful detections per minute
- **Camera Performance**: Individual camera statistics
- **System Health**: Overall system status indicators

#### Historical Analysis
- **Person Flow**: Movement patterns over time
- **Occupancy Trends**: People counts throughout the day
- **Popular Paths**: Most common movement routes
- **Dwell Time Analysis**: How long people spend in different areas

### Using Analytics Charts

#### Chart Types
1. **Line Charts**: Time-series data showing trends over time
2. **Bar Charts**: Comparative data between different categories
3. **Heatmaps**: Spatial visualization of activity intensity
4. **Pie Charts**: Proportional breakdowns of categorical data

#### Interactive Features
- **Time Range Selection**: Adjust date/time ranges using controls
- **Zoom and Pan**: Detailed examination of specific time periods
- **Data Point Inspection**: Hover over chart elements for detailed information
- **Export Options**: Download charts as images or raw data

#### Filtering Options
- **Camera Filter**: Show data from specific cameras only
- **Time Period**: Hour, day, week, month view options
- **Person Type**: Filter by detection confidence levels
- **Activity Level**: Focus on high-activity periods

### Custom Reports

#### Creating Reports
1. **Select Metrics**: Choose data points to include in report
2. **Set Time Range**: Define the analysis period
3. **Apply Filters**: Narrow down data based on specific criteria
4. **Choose Format**: Select output format (PDF, CSV, Excel)
5. **Generate Report**: System compiles and prepares report

#### Scheduled Reports
- **Daily Summaries**: Automatic daily activity reports
- **Weekly Trends**: Weekly pattern analysis
- **Monthly Analytics**: Comprehensive monthly insights
- **Custom Schedules**: Define your own reporting intervals

### Heatmap Visualization

#### Understanding Heatmaps
- **Color Intensity**: Warmer colors (red/orange) indicate higher activity
- **Cool Areas**: Blue/green areas show lower activity levels
- **Time Animation**: Watch activity patterns evolve over time
- **Overlay Options**: Combine with camera views or map layouts

#### Heatmap Controls
- **Time Slider**: Adjust time period for heatmap generation
- **Intensity Scale**: Modify color scaling for better visualization
- **Overlay Toggle**: Show/hide underlying map or camera views
- **Export Options**: Save heatmaps as images for presentations

## Settings

### System Configuration

#### Display Preferences
- **Theme Selection**: Light or dark mode options
- **Language**: Interface language selection (if multiple languages supported)
- **Time Format**: 12-hour or 24-hour time display
- **Date Format**: Various date format options

#### Tracking Settings
- **Confidence Threshold**: Minimum confidence level for displaying detections
- **Bounding Box Style**: Color schemes and line thickness options
- **Person ID Display**: Show/hide person identifiers
- **Path Visualization**: Historical path display preferences

#### Performance Settings
- **Frame Rate**: Adjust video refresh rate for performance
- **Quality Settings**: Video quality vs. performance balance
- **Cache Settings**: Local storage preferences for faster loading
- **Network Optimization**: Bandwidth usage optimization

### Camera Configuration

#### Individual Camera Settings
- **Camera Names**: Custom labels for each camera
- **Detection Zones**: Define specific areas for monitoring
- **Sensitivity Settings**: Adjust detection sensitivity per camera
- **Recording Settings**: Local recording preferences if supported

#### Multi-Camera Coordination
- **Synchronization**: Ensure all cameras display in sync
- **Cross-Camera Tracking**: Enable/disable person matching between cameras
- **Coordinate Mapping**: Calibrate camera-to-map coordinate systems
- **Time Offset**: Adjust for any camera time differences

### User Preferences

#### Notification Settings
- **Alert Preferences**: Choose which events trigger notifications
- **Sound Alerts**: Enable/disable audio notifications
- **Email Notifications**: Configure email alerts for important events
- **Display Notifications**: On-screen notification preferences

#### Accessibility Options
- **High Contrast Mode**: Enhanced visibility for users with vision impairments
- **Font Size**: Adjustable text size throughout interface
- **Screen Reader Support**: Compatibility settings for assistive technologies
- **Keyboard Navigation**: Enhanced keyboard shortcut support

### Data Management

#### Export Settings
- **Default Format**: Preferred format for data exports
- **Export Quality**: Balance between file size and data detail
- **Automatic Exports**: Schedule regular data exports
- **Storage Location**: Where to save exported files

#### Privacy Settings
- **Data Retention**: How long to keep tracking data
- **Anonymization**: Options for removing identifying information
- **Access Logging**: Track who accesses the system and when
- **Consent Management**: User consent tracking and management

## Troubleshooting

### Common Issues and Solutions

#### Connection Problems
**Issue**: Cannot connect to the system
**Solutions**:
1. Check your internet connection
2. Verify the correct URL is being used
3. Clear browser cache and cookies
4. Try a different browser
5. Contact your IT administrator

**Issue**: Intermittent disconnections
**Solutions**:
1. Check network stability
2. Disable browser extensions that might interfere
3. Use a wired connection instead of Wi-Fi
4. Contact technical support if issues persist

#### Video Display Issues
**Issue**: Camera feeds not loading
**Solutions**:
1. Refresh the page (F5 or Ctrl+R)
2. Check if other cameras are working
3. Verify backend system is running
4. Clear browser cache
5. Try using a different browser

**Issue**: Poor video quality or lag
**Solutions**:
1. Check network bandwidth
2. Adjust quality settings in preferences
3. Close other bandwidth-intensive applications
4. Try reducing the number of simultaneous camera views

#### Tracking Problems
**Issue**: Person detection not working properly
**Solutions**:
1. Check camera positioning and lighting
2. Verify confidence threshold settings
3. Report false positives/negatives to administrators
4. Check if cameras need cleaning or adjustment

**Issue**: Cross-camera tracking inconsistent
**Solutions**:
1. Verify camera synchronization settings
2. Check coordinate mapping calibration
3. Report tracking issues with specific examples
4. Consider adjusting sensitivity settings

#### Performance Issues
**Issue**: System running slowly
**Solutions**:
1. Close unnecessary browser tabs
2. Reduce video quality in settings
3. Disable features you don't need
4. Check available system memory
5. Try using a more powerful computer

**Issue**: Browser crashes or freezes
**Solutions**:
1. Ensure browser is up to date
2. Clear browser cache and data
3. Disable browser extensions
4. Try incognito/private browsing mode
5. Switch to a different supported browser

### Error Messages

#### "Connection Lost"
- **Meaning**: Communication with backend server interrupted
- **Action**: System will automatically attempt to reconnect
- **Manual Fix**: Refresh page if reconnection fails

#### "Processing Task Failed"
- **Meaning**: Backend processing encountered an error
- **Action**: Try starting a new tracking session
- **Manual Fix**: Check with administrator if problem persists

#### "Camera Unavailable"
- **Meaning**: Specific camera feed is not accessible
- **Action**: System will continue with available cameras
- **Manual Fix**: Report camera issues to technical support

#### "Authentication Required"
- **Meaning**: Your session has expired or credentials are needed
- **Action**: System will redirect to login page
- **Manual Fix**: Log in again with valid credentials

### Getting Help

#### Self-Service Resources
- **In-App Help**: Look for "?" or "Help" buttons throughout the interface
- **Keyboard Shortcuts**: Press "?" key for keyboard shortcut reference
- **Video Tutorials**: Check for embedded tutorial videos
- **FAQ Section**: Common questions and answers

#### Contacting Support
- **Technical Issues**: Contact IT support with specific error messages
- **Feature Requests**: Submit suggestions through feedback forms
- **Training**: Request additional training sessions if needed
- **Bug Reports**: Report problems with detailed steps to reproduce

#### Information to Provide When Seeking Help
1. **Browser Type and Version**: e.g., "Chrome 120.0.6099.109"
2. **Operating System**: e.g., "Windows 11", "macOS Monterey"
3. **Error Messages**: Exact text of any error messages
4. **Steps to Reproduce**: Detailed steps that led to the problem
5. **Screenshots**: Visual documentation of the issue
6. **Time of Occurrence**: When the problem happened

---

For additional support or questions not covered in this manual, please contact your system administrator or technical support team.