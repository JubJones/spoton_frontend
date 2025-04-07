// src/pages/SelectZonePage.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation

// Define the different zones based on your image
const zones = [
  { name: 'Retail Spaces', path: '/group-view', bgColor: 'bg-red-200' }, // Example colors
  { name: 'Offices', path: '/group-view', bgColor: 'bg-blue-200' },
  { name: 'Industrial Facilities', path: '/group-view', bgColor: 'bg-green-200' },
  { name: 'Campus', path: '/group-view', bgColor: 'bg-yellow-200' },
  { name: 'Lobbies', path: '/group-view', bgColor: 'bg-purple-200' },
];

const SelectZonePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-800 text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-orange-500">Spoton</h1>
        <nav>
          {/* Add FAQ/Help links if needed */}
          <span className="mr-4">Select the view</span>
          <a href="#" className="mr-4 hover:text-orange-500">FAQ</a>
          <a href="#" className="hover:text-orange-500">Help?</a>
        </nav>
      </header>

      {/* Tagline */}
      <p className="text-center text-xl mb-12">
        Beyond Watching: Intelligent Tracking in Action
      </p>

      {/* Zone Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {zones.map((zone) => (
          // Each zone is a Link that navigates to its defined path
          <Link
            key={zone.name}
            to={zone.path} // Navigate to the path defined in the zones array
            className={`p-6 rounded-lg shadow-lg flex flex-col items-center justify-center h-48 cursor-pointer hover:opacity-80 transition-opacity ${zone.bgColor} text-gray-800`}
          >
            {/* Placeholder for the image */}
            <div className="w-full h-3/4 bg-gray-500 mb-2 flex items-center justify-center text-gray-400">
              (Image Placeholder)
            </div>
            <span className="font-semibold">{zone.name}</span>
          </Link>
        ))}
        {/* Add an empty div if you have 5 items and want the last row aligned left on medium screens */}
         <div className="hidden md:block"></div>
      </div>
    </div>
  );
};

export default SelectZonePage;