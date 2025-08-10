// src/components/SingleVideoPlayer.tsx
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';

interface SingleVideoPlayerProps {
  videoId: string;
  // ADDED: Prop to control file input visibility, defaults to true
  showFileInput?: boolean;
  videoSrc: string | null;
  onFileSelect: (videoId: string, file: File | null) => void;
  className?: string;
}

// Use default value for the new prop
const SingleVideoPlayer: React.FC<SingleVideoPlayerProps> = ({
  videoId,
  showFileInput = true, // Default to true if not provided
  videoSrc,
  onFileSelect,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      onFileSelect(videoId, file);
    } else {
      onFileSelect(videoId, null);
    }
  };

  useEffect(() => {
    return () => {
      // Parent handles URL revocation
    };
  }, [videoSrc]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-black rounded-md overflow-hidden ${className}`}
    >
      {videoSrc ? (
        <video
          controls
          width="100%"
          height="auto"
          src={videoSrc}
          className="w-full h-full object-contain"
        >
          Your browser doesn't support embedded videos.
        </video>
      ) : (
        <div className="text-gray-500 text-center p-4">No video selected for {videoId}</div>
      )}
      {/* --- Conditionally render the file input based on the prop --- */}
      {showFileInput && (
        <div className="absolute bottom-2 left-2">
          <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded cursor-pointer">
            Choose {videoId} File
            <input
              type="file"
              accept="video/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
      {/* --- End conditional rendering --- */}
    </div>
  );
};

export default SingleVideoPlayer;
