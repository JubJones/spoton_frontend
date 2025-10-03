// Mock mode configuration for SpotOn frontend
// Toggle between mock data and real backend
// src/config/mock.ts

// Mock mode disabled: always use live backend.
export const MOCK_MODE_ENABLED = false;

// Mock configuration options
export const MOCK_CONFIG = {
  // Enable/disable mock mode entirely
  enabled: MOCK_MODE_ENABLED,
  
  // Mock specific services (can be individually controlled)
  services: {
    api: false,
    websocket: false,
    systemHealth: false,
    tracking: false,
  },
  
  // Mock behavior settings
  behavior: {
    // Simulate network delays
    simulateNetworkDelay: false,
    
    // Simulate occasional errors
    simulateErrors: false,
    
    // Auto-start processing when environment is selected
    autoStartProcessing: false,
    
    // Show mock indicators in UI
    showMockIndicators: false,
  },
  
  // Performance settings for mock data
  performance: {
    frameUpdateInterval: 1000, // Legacy defaults (unused when disabled)
    maxPersonsPerCamera: 4,
    enableBase64Images: true,
  }
} as const;
