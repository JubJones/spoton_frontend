// src/VideoPlayer.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';

// Define props if you need any in the future, otherwise an empty interface is fine
interface VideoPlayerProps {}

const VideoPlayer: React.FC<VideoPlayerProps> = () => {
  // State to hold the object URL for the video file
  // Initialize with null and specify the type as string | null
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Handle the file input change event
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Check if files exist on the event target
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Revoke the previous object URL if it exists, to prevent memory leaks
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }

      // Create a new object URL for the selected file
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  // useEffect hook for cleanup: Revoke the object URL when the component unmounts
  // or when the videoSrc changes before the component unmounts.
  useEffect(() => {
    // Return a cleanup function
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]); // Dependency array ensures this runs when videoSrc changes

  return (
    <div>
      <h2>Local Video Player POC (TypeScript)</h2>
      <input type="file" accept="video/*" onChange={handleFileChange} />

      {/* Conditionally render the video element only if videoSrc is not null */}
      {videoSrc && (
        <video controls width="600" src={videoSrc} style={{ marginTop: '20px' }}>
          Sorry, your browser doesn't support embedded videos.
        </video>
      )}
    </div>
  );
};

export default VideoPlayer;