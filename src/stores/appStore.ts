export interface AppStore {
  // Connection state
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  websocketUrl: string;
  lastConnectedAt: string | null;
  
  // UI state
  activeTab: string;
  isPlaying: boolean;
  isFullscreen: boolean;
  sidebarOpen: boolean;
  
  // Performance metrics
  performanceMetrics: {
    fps: number;
    frameDrops: number;
    latency: number;
    memoryUsage: number;
  };
  
  // Error state
  lastError: string | null;
  errorCount: number;
  
  // Settings
  settings: {
    theme: 'dark' | 'light';
    notifications: boolean;
    autoReconnect: boolean;
    maxRetries: number;
  };
}

export const createAppStore = (): AppStore => ({
  // Connection state
  connectionStatus: 'disconnected',
  websocketUrl: 'ws://localhost:8000',
  lastConnectedAt: null,
  
  // UI state
  activeTab: 'all',
  isPlaying: false,
  isFullscreen: false,
  sidebarOpen: true,
  
  // Performance metrics
  performanceMetrics: {
    fps: 0,
    frameDrops: 0,
    latency: 0,
    memoryUsage: 0,
  },
  
  // Error state
  lastError: null,
  errorCount: 0,
  
  // Settings
  settings: {
    theme: 'dark',
    notifications: true,
    autoReconnect: true,
    maxRetries: 5,
  },
});