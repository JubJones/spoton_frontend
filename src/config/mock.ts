// Mock mode configuration for SpotOn frontend
// Toggle between mock data and real backend
// src/config/mock.ts

// Environment variable to control mock mode
// Set VITE_USE_MOCK_DATA=true in .env.local to enable mock mode
export const MOCK_MODE_ENABLED = 
  import.meta.env.VITE_USE_MOCK_DATA === 'true' || 
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// Mock configuration options
export const MOCK_CONFIG = {
  // Enable/disable mock mode entirely
  enabled: MOCK_MODE_ENABLED,
  
  // Mock specific services (can be individually controlled)
  services: {
    api: MOCK_MODE_ENABLED,
    websocket: MOCK_MODE_ENABLED,
    systemHealth: MOCK_MODE_ENABLED,
    tracking: MOCK_MODE_ENABLED,
  },
  
  // Mock behavior settings
  behavior: {
    // Simulate network delays
    simulateNetworkDelay: true,
    
    // Simulate occasional errors
    simulateErrors: false,
    
    // Auto-start processing when environment is selected
    autoStartProcessing: true,
    
    // Show mock indicators in UI
    showMockIndicators: import.meta.env.DEV,
  },
  
  // Performance settings for mock data
  performance: {
    frameUpdateInterval: 1000, // 1 second between frame updates
    maxPersonsPerCamera: 4,
    enableBase64Images: true, // Include base64 image data
  }
} as const;

// Log mock mode status
if (import.meta.env.DEV) {
  console.log('🎭 Mock Mode Configuration:', {
    enabled: MOCK_CONFIG.enabled,
    services: MOCK_CONFIG.services,
    env: {
      VITE_USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA,
      NODE_ENV: import.meta.env.NODE_ENV,
      DEV: import.meta.env.DEV,
    }
  });
}