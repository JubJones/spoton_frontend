// Mock Mode Indicator - Shows when the app is running with mock data
// src/components/MockModeIndicator.tsx

import React from 'react';
import { MOCK_CONFIG } from '../config/mock';

interface MockModeIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const MockModeIndicator: React.FC<MockModeIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  // Only show in development and when mock mode is enabled
  if (!MOCK_CONFIG.enabled || !MOCK_CONFIG.behavior.showMockIndicators) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-yellow-500 text-black px-3 py-1 rounded-md shadow-lg font-semibold text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🎭</span>
          <span>MOCK MODE</span>
        </div>
        
        {showDetails && (
          <div className="mt-2 text-xs opacity-90">
            <div>API: {MOCK_CONFIG.services.api ? '✓' : '✗'}</div>
            <div>WebSocket: {MOCK_CONFIG.services.websocket ? '✓' : '✗'}</div>
            <div>Health: {MOCK_CONFIG.services.systemHealth ? '✓' : '✗'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockModeIndicator;