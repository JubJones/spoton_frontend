// src/pages/GroupViewPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SingleVideoPlayer from '../components/SingleVideoPlayer'; // Import the new component

// Mock data (can be dynamic later)
const zoneName = "Campus";
const totalCameras = 4;
const activeCameras = 4;
const cameraIds = ['camera1', 'camera2', 'camera3', 'camera4']; // Use IDs
const cameraNames = ['Camera 1', 'Camera 2', 'Camera 3', 'Camera 4']; // For display
const mockDetections = [145, 117, 82, 29];

type TabType = 'all' | string; // 'all' or a camera ID like 'camera1'

// Interface for video sources state
interface VideoSources {
  [key: string]: string | null; // e.g., { camera1: 'blob:...', camera2: null }
}

const GroupViewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [videoSources, setVideoSources] = useState<VideoSources>({}); // State for video URLs
  const [objectUrls, setObjectUrls] = useState<string[]>([]); // Keep track of created URLs for cleanup

  // Function passed to SingleVideoPlayer to update the sources state
  const handleFileSelected = (videoId: string, file: File | null) => {
    setVideoSources(prevSources => {
      const currentUrl = prevSources[videoId];
      let newUrl: string | null = null;

      // Create new URL if a file is selected
      if (file) {
        newUrl = URL.createObjectURL(file);
        // Keep track of the new URL for cleanup
        setObjectUrls(prevUrls => [...prevUrls, newUrl!]);
      }

      // Revoke the previous URL for this specific player if it existed
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
        // Remove from tracked URLs
         setObjectUrls(prevUrls => prevUrls.filter(url => url !== currentUrl));
      }

      // Update the state
      return {
        ...prevSources,
        [videoId]: newUrl,
      };
    });
  };

   // Cleanup all object URLs on component unmount
   useEffect(() => {
    return () => {
      console.log("Cleaning up object URLs:", objectUrls);
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [objectUrls]); // Rerun effect if objectUrls array changes


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 p-4 sm:p-6">
      {/* Header Section (same as before) */}
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
         <Link to="/" className="flex items-center text-lg hover:text-orange-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Back
        </Link>
        <h1 className="text-2xl font-semibold">{zoneName}</h1>
        <div></div>
      </header>

      {/* Info Bar (same as before) */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-gray-800 p-3 rounded-md flex-shrink-0">
         <div>Number of cameras: <span className="font-semibold">{totalCameras}</span></div>
         <div className="flex space-x-4 mt-2 sm:mt-0">
             <span className="text-green-400 flex items-center"><span className="h-2 w-2 bg-green-400 rounded-full mr-1"></span> Active: {activeCameras}</span>
             <span className="text-red-400 flex items-center"><span className="h-2 w-2 bg-red-400 rounded-full mr-1"></span> Inactive: {totalCameras - activeCameras}</span>
         </div>
          <div className="mt-2 sm:mt-0">Map visualization: <span className="font-semibold">floor 1</span></div>
       </div>

      {/* Tab Bar (using cameraIds now for state) */}
      <div className="mb-4 border-b border-gray-700 flex-shrink-0">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('all')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
            View all
          </button>
          {cameraIds.map((id, index) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === id ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
              {cameraNames[index]} {/* Display friendly name */}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-grow min-h-0 gap-4">

        {/* Left Side (Video Player Area) */}
        <div className="w-2/3 bg-gray-800 rounded-md p-1 flex items-center justify-center">
          {/* --- Conditional Rendering Logic --- */}

          {/* 'View All' Tab: Show 2x2 Grid */}
          {activeTab === 'all' && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
              {cameraIds.map((id) => (
                <SingleVideoPlayer
                  key={id}
                  videoId={id}
                  videoSrc={videoSources[id] || null}
                  onFileSelect={handleFileSelected}
                  className="min-h-0" // Ensure players fit grid
                />
              ))}
            </div>
          )}

          {/* Specific Camera Tab: Show Single Large Player */}
          {cameraIds.includes(activeTab) && (
            <SingleVideoPlayer
              key={activeTab}
              videoId={activeTab}
              videoSrc={videoSources[activeTab] || null}
              onFileSelect={handleFileSelected}
              showFileInput={false} // <<< Pass false here to hide input
              className="w-full h-full"
            />
          )}
          {/* --- End Conditional Rendering --- */}
        </div>

        {/* Right Side Panels (same as before) */}
        <div className="w-1/3 flex flex-col gap-4">
           {/* Map Visualization Panel */}
          <div className="bg-gray-800 rounded-md p-4 h-1/2 flex items-center justify-center text-gray-500">Mock Map Visualization</div>
           {/* Lower Right Panels */}
           <div className="flex flex-grow gap-4 h-1/2">
              {/* Detections Panel */}
              <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col">
                 <h3 className="text-sm font-semibold mb-3 text-gray-400">Number of detection for each camera</h3>
                  <div className="space-y-2 text-xs flex-grow">
                   {cameraNames.map((name, index) => (
                     <div key={name} className="flex items-center justify-between">
                       <span>{name}</span>
                       <div className="flex items-center">
                         <div className="w-16 h-2 bg-gray-700 rounded-full mr-2"><div className="h-2 bg-green-500 rounded-full" style={{ width: `${(mockDetections[index] / Math.max(...mockDetections)) * 100}%` }}></div></div>
                         <span className="font-mono">{mockDetections[index]}</span>
                       </div>
                     </div>))}
                 </div>
              </div>
              {/* Person Details Panel */}
                <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col justify-between">
                 <div>
                   <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-semibold text-gray-400">Last caught</h3><span className="text-green-400 text-xs font-semibold flex items-center"><span className="h-1.5 w-1.5 bg-green-400 rounded-full mr-1"></span>Active</span></div>
                    <p className="text-xs">Camera <span className="font-bold text-lg">3</span></p>
                    <p className="text-xs mt-3">Person Id: <span className="font-bold">1</span></p>
                    <p className="text-xs mt-1">Tracking start: 25 min. ago</p>
                    <p className="text-xs mt-1">Last known: Room1</p>
                 </div>
                  <button className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold mt-3">Cancel</button>
                </div>
           </div>
        </div> {/* End Right Side */}
      </div> {/* End Main Content Area */}
    </div> // End Page Container
  );
};

export default GroupViewPage;