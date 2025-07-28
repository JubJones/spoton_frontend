import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  AnalyticsData, 
  AnalyticsTimeRange, 
  AnalyticsFilter, 
  HistoricalData, 
  PerformanceMetrics, 
  SystemHealth,
  PersonJourney,
  BehavioralAnalytics,
  DwellTimeAnalysis,
  TrafficPattern,
  HeatmapData,
  AlertData
} from '../services/types/api';
import { analyticsAPI } from '../services/analyticsAPI';

export interface AnalyticsState {
  // Real-time data
  realtimeData: AnalyticsData | null;
  lastUpdated: number;
  
  // Historical data
  historicalData: HistoricalData | null;
  
  // Performance data
  performanceMetrics: PerformanceMetrics | null;
  systemHealth: SystemHealth | null;
  
  // Behavioral data
  behavioralAnalytics: BehavioralAnalytics | null;
  dwellTimeAnalysis: DwellTimeAnalysis | null;
  trafficPatterns: TrafficPattern[];
  
  // Heatmap data
  heatmapData: HeatmapData | null;
  
  // Person journey data
  personJourneys: Map<string, PersonJourney>;
  
  // Alerts
  alerts: AlertData[];
  unreadAlerts: number;
  
  // UI state
  activeTab: string;
  timeRange: AnalyticsTimeRange;
  filters: AnalyticsFilter;
  isLoading: boolean;
  error: string | null;
  
  // Auto-refresh
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  
  // Export state
  isExporting: boolean;
  lastExportTime: number;
  
  // Actions
  setActiveTab: (tab: string) => void;
  setTimeRange: (range: AnalyticsTimeRange) => void;
  setFilters: (filters: AnalyticsFilter) => void;
  setAutoRefresh: (enabled: boolean, interval?: number) => void;
  
  // Data loading actions
  loadRealtimeData: () => Promise<void>;
  loadHistoricalData: () => Promise<void>;
  loadPerformanceData: () => Promise<void>;
  loadBehavioralData: () => Promise<void>;
  loadHeatmapData: () => Promise<void>;
  loadPersonJourney: (personId: string) => Promise<void>;
  
  // Export actions
  exportData: (format: 'csv' | 'json' | 'pdf') => Promise<void>;
  generateReport: (reportType: 'summary' | 'detailed' | 'performance' | 'security') => Promise<void>;
  
  // Alert actions
  markAlertAsRead: (alertId: string) => void;
  markAllAlertsAsRead: () => void;
  
  // Utility actions
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  realtimeData: null,
  lastUpdated: 0,
  historicalData: null,
  performanceMetrics: null,
  systemHealth: null,
  behavioralAnalytics: null,
  dwellTimeAnalysis: null,
  trafficPatterns: [],
  heatmapData: null,
  personJourneys: new Map(),
  alerts: [],
  unreadAlerts: 0,
  activeTab: 'realtime',
  timeRange: {
    startTime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
    endTime: Date.now(),
    interval: 'hour' as const
  },
  filters: {
    confidenceThreshold: 0.7
  },
  isLoading: false,
  error: null,
  autoRefreshEnabled: true,
  refreshInterval: 30000, // 30 seconds
  isExporting: false,
  lastExportTime: 0,
};

export const useAnalyticsStore = create<AnalyticsState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // UI actions
    setActiveTab: (tab: string) => {
      set({ activeTab: tab });
    },

    setTimeRange: (range: AnalyticsTimeRange) => {
      set({ timeRange: range });
    },

    setFilters: (filters: AnalyticsFilter) => {
      set({ filters });
    },

    setAutoRefresh: (enabled: boolean, interval?: number) => {
      set({ 
        autoRefreshEnabled: enabled,
        refreshInterval: interval || get().refreshInterval
      });
    },

    // Data loading actions
    loadRealtimeData: async () => {
      const { filters } = get();
      set({ isLoading: true, error: null });
      
      try {
        const data = await analyticsAPI.getRealTimeAnalytics(filters);
        set({ 
          realtimeData: data,
          lastUpdated: Date.now(),
          isLoading: false 
        });
      } catch (error) {
        console.error('Failed to load real-time data:', error);
        set({ 
          error: 'Failed to load real-time data',
          isLoading: false 
        });
      }
    },

    loadHistoricalData: async () => {
      const { timeRange, filters } = get();
      set({ isLoading: true, error: null });
      
      try {
        const data = await analyticsAPI.getHistoricalAnalytics(timeRange, filters);
        set({ 
          historicalData: data,
          isLoading: false 
        });
      } catch (error) {
        console.error('Failed to load historical data:', error);
        set({ 
          error: 'Failed to load historical data',
          isLoading: false 
        });
      }
    },

    loadPerformanceData: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const [metrics, health] = await Promise.all([
          analyticsAPI.getPerformanceMetrics(),
          analyticsAPI.getSystemHealth()
        ]);
        
        set({ 
          performanceMetrics: metrics,
          systemHealth: health,
          alerts: health.alerts,
          unreadAlerts: health.alerts.filter(alert => !alert.isAcknowledged).length,
          isLoading: false 
        });
      } catch (error) {
        console.error('Failed to load performance data:', error);
        set({ 
          error: 'Failed to load performance data',
          isLoading: false 
        });
      }
    },

    loadBehavioralData: async () => {
      const { filters, timeRange } = get();
      set({ isLoading: true, error: null });
      
      try {
        const [behavioral, dwellTime, traffic] = await Promise.all([
          analyticsAPI.getBehavioralAnalytics(filters),
          analyticsAPI.getDwellTimeAnalysis(filters),
          analyticsAPI.getTrafficPatterns(timeRange, filters)
        ]);
        
        set({ 
          behavioralAnalytics: behavioral,
          dwellTimeAnalysis: dwellTime,
          trafficPatterns: traffic,
          isLoading: false 
        });
      } catch (error) {
        console.error('Failed to load behavioral data:', error);
        set({ 
          error: 'Failed to load behavioral data',
          isLoading: false 
        });
      }
    },

    loadHeatmapData: async () => {
      const { timeRange, filters } = get();
      set({ isLoading: true, error: null });
      
      try {
        const data = await analyticsAPI.getHeatmapData(timeRange, filters);
        set({ 
          heatmapData: data,
          isLoading: false 
        });
      } catch (error) {
        console.error('Failed to load heatmap data:', error);
        set({ 
          error: 'Failed to load heatmap data',
          isLoading: false 
        });
      }
    },

    loadPersonJourney: async (personId: string) => {
      const { timeRange, personJourneys } = get();
      set({ isLoading: true, error: null });
      
      try {
        const journey = await analyticsAPI.getPersonJourney(personId, timeRange);
        const updatedJourneys = new Map(personJourneys);
        updatedJourneys.set(personId, journey);
        
        set({ 
          personJourneys: updatedJourneys,
          isLoading: false 
        });
      } catch (error) {
        console.error('Failed to load person journey:', error);
        set({ 
          error: 'Failed to load person journey',
          isLoading: false 
        });
      }
    },

    // Export actions
    exportData: async (format: 'csv' | 'json' | 'pdf') => {
      const { filters, timeRange } = get();
      set({ isExporting: true, error: null });
      
      try {
        const blob = await analyticsAPI.exportAnalytics(format, filters, timeRange);
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        set({ 
          isExporting: false,
          lastExportTime: Date.now()
        });
      } catch (error) {
        console.error('Failed to export data:', error);
        set({ 
          error: 'Failed to export data',
          isExporting: false 
        });
      }
    },

    generateReport: async (reportType: 'summary' | 'detailed' | 'performance' | 'security') => {
      const { filters, timeRange } = get();
      set({ isExporting: true, error: null });
      
      try {
        const response = await analyticsAPI.generateReport(reportType, filters, timeRange);
        console.log('Report generated:', response);
        
        set({ 
          isExporting: false,
          lastExportTime: Date.now()
        });
      } catch (error) {
        console.error('Failed to generate report:', error);
        set({ 
          error: 'Failed to generate report',
          isExporting: false 
        });
      }
    },

    // Alert actions
    markAlertAsRead: (alertId: string) => {
      const { alerts } = get();
      const updatedAlerts = alerts.map(alert => 
        alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
      );
      const unreadCount = updatedAlerts.filter(alert => !alert.isAcknowledged).length;
      
      set({ 
        alerts: updatedAlerts,
        unreadAlerts: unreadCount
      });
    },

    markAllAlertsAsRead: () => {
      const { alerts } = get();
      const updatedAlerts = alerts.map(alert => ({ ...alert, isAcknowledged: true }));
      
      set({ 
        alerts: updatedAlerts,
        unreadAlerts: 0
      });
    },

    // Utility actions
    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Auto-refresh subscription
let refreshInterval: NodeJS.Timeout | null = null;

useAnalyticsStore.subscribe(
  (state) => state.autoRefreshEnabled,
  (enabled) => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    
    if (enabled) {
      const state = useAnalyticsStore.getState();
      refreshInterval = setInterval(() => {
        const currentState = useAnalyticsStore.getState();
        if (currentState.activeTab === 'realtime' && !currentState.isLoading) {
          currentState.loadRealtimeData();
        }
      }, state.refreshInterval);
    }
  }
);

// Performance monitoring subscription
useAnalyticsStore.subscribe(
  (state) => state.systemHealth,
  (health) => {
    if (health && health.overall === 'critical') {
      console.warn('System health is critical:', health);
      // Could trigger notifications or alerts here
    }
  }
);

// Export some selectors for common use cases
export const useAnalyticsSelectors = () => {
  const store = useAnalyticsStore();
  
  return {
    // Data selectors
    realtimeData: store.realtimeData,
    historicalData: store.historicalData,
    performanceData: {
      metrics: store.performanceMetrics,
      health: store.systemHealth
    },
    behavioralData: {
      behavioral: store.behavioralAnalytics,
      dwellTime: store.dwellTimeAnalysis,
      traffic: store.trafficPatterns
    },
    heatmapData: store.heatmapData,
    
    // UI state selectors
    activeTab: store.activeTab,
    isLoading: store.isLoading,
    error: store.error,
    
    // Alert selectors
    alerts: store.alerts,
    unreadAlerts: store.unreadAlerts,
    criticalAlerts: store.alerts.filter(alert => alert.severity === 'critical'),
    
    // Export state
    isExporting: store.isExporting,
    
    // Actions
    actions: {
      setActiveTab: store.setActiveTab,
      setTimeRange: store.setTimeRange,
      setFilters: store.setFilters,
      loadRealtimeData: store.loadRealtimeData,
      loadHistoricalData: store.loadHistoricalData,
      loadPerformanceData: store.loadPerformanceData,
      loadBehavioralData: store.loadBehavioralData,
      loadHeatmapData: store.loadHeatmapData,
      exportData: store.exportData,
      generateReport: store.generateReport,
      markAlertAsRead: store.markAlertAsRead,
      markAllAlertsAsRead: store.markAllAlertsAsRead,
      clearError: store.clearError
    }
  };
};