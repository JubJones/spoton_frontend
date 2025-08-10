# Overview
Core Functionality & Features
Visualization of Tracking Data:
Presents multiple camera views simultaneously or single camera feeds.
Displays tracking data (bounding boxes) and labels (global_person_id) directly over camera images.
Visualizes current locations and historical paths of tracked individuals on a unified 2D map canvas using map_coordinates.
Fetches and displays camera images using S3 URLs provided by the backend.
Displays count of detected people per camera.
Lists cropped images of detected people below the camera feed.
User Interaction & Control:
Landing Page: Allows users to select the environment (Campus/Factory) and specify the date/time range for analysis.
Playback Control: Handles user interactions for controlling playback of recorded video.
Camera Selection: Allows users to select specific cameras for viewing.
"Focus Track" Feature:
Users can click on a cropped image or a bounding box to select a specific global_person_id.
The UI highlights this selected person across all camera views and on the 2D map.
Detailed Information Display: Displays comprehensive details for a selected person, including:
Position tracking status, coordinates, confidence, and timestamp.
First detected time.
Current tracking duration.
Movement analysis metrics (if available).
Data Management & Communication:
WebSocket Listener: Receives real-time tracking data payloads (including camera_id, timestamp, image_url, tracking_data with global_person_id, bbox_img, map_coordinates) from the Backend via WebSocket.
State Management (Zustand): Stores and manages the received real-time tracking data.
Rendering: Updates the UI dynamically based on changes in the stored state.
Communication with Backend:
Sends initial requests (e.g., target cameras, time range) to the Backend via REST APIs or WebSocket.
Sends control commands (e.g., "focus track" selection) back to the Backend via WebSocket or REST.
Optional Pages/Features:
Analytics Page: Displays aggregated statistics (e.g., overall detection rates, counts per zone) queried from the Backend via REST APIs.
Settings Page: Provides an interface for adjusting system parameters.

# UI
in example_ui directory

# RULE
- DO NOT MODIFY THE UI

# Initial instruction
The current prompt of the idea is still too vague, You will have to plan for the future where I comeback to config each of the feature as well but first of all, the plan should make you able to create a first draft of the application first.

# Example UI
See in the example_ui folder, the name is already tell what each of the ui does. there is also the analytics and setting page as an optional, but you should do it as well.