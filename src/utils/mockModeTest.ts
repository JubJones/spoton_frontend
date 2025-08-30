// Mock Mode Test Utilities
// Quick test to verify all pages work in mock mode
// src/utils/mockModeTest.ts

import { MOCK_CONFIG } from '../config/mock';

export interface PageTestResult {
  path: string;
  name: string;
  accessible: boolean;
  mockCompatible: boolean;
  error?: string;
}

export const PAGES_TO_TEST = [
  { path: '/', name: 'Landing Page' },
  { path: '/environments', name: 'Environment Selection' },
  { path: '/zones', name: 'Zone Selection (Legacy)' },
  { path: '/group-view?environment=factory', name: 'Group View (Factory)' },
  { path: '/group-view?environment=campus', name: 'Group View (Campus)' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/settings', name: 'Settings' },
  { path: '/help', name: 'Help' },
  { path: '/about', name: 'About' },
];

export function getMockModeStatus() {
  return {
    enabled: MOCK_CONFIG.enabled,
    services: MOCK_CONFIG.services,
    config: MOCK_CONFIG,
  };
}

export function logMockModeInfo() {
  const status = getMockModeStatus();
  
  console.group('🎭 Mock Mode Status');
  console.log('Enabled:', status.enabled);
  console.log('Services:', status.services);
  console.log('Environment Variables:', {
    VITE_USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA,
    NODE_ENV: import.meta.env.NODE_ENV,
    DEV: import.meta.env.DEV,
  });
  console.groupEnd();
  
  if (status.enabled) {
    console.log('✅ Mock mode is active - all pages should work without backend');
  } else {
    console.log('❌ Mock mode is disabled - backend connection required');
  }
  
  return status;
}

// Development helper function
if (import.meta.env.DEV) {
  (window as any).testMockMode = logMockModeInfo;
  console.log('🎭 Run window.testMockMode() to check mock mode status');
}