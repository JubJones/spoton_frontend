import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

import { AppStore, createAppStore } from './appStore';
import { DetectionStore, createDetectionStore } from './detectionStore';
import { TrackingStore, createTrackingStore } from './trackingStore';
import { MappingStore, createMappingStore } from './mappingStore';

// Combined store type
export interface RootStore {
  app: AppStore;
  detection: DetectionStore;
  tracking: TrackingStore;
  mapping: MappingStore;
}

// Create the main store
export const useStore = create<RootStore>()(
  devtools(
    subscribeWithSelector(() => ({
      app: createAppStore(),
      detection: createDetectionStore(),
      tracking: createTrackingStore(),
      mapping: createMappingStore(),
    })),
    {
      name: 'spoton-store',
    }
  )
);

// Individual store hooks for convenience
export const useAppStore = () => useStore(state => state.app);
export const useDetectionStore = () => useStore(state => state.detection);
export const useTrackingStore = () => useStore(state => state.tracking);
export const useMappingStore = () => useStore(state => state.mapping);

// Store actions
export const appActions = {
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => 
    useStore.setState(state => ({ app: { ...state.app, connectionStatus: status } })),
  
  setActiveTab: (tab: string) => 
    useStore.setState(state => ({ app: { ...state.app, activeTab: tab } })),
  
  setIsPlaying: (isPlaying: boolean) => 
    useStore.setState(state => ({ app: { ...state.app, isPlaying } })),
};

export const detectionActions = {
  updateFrameData: (frameData: any) => 
    useStore.setState(state => ({ detection: { ...state.detection, currentFrameData: frameData } })),
  
  updateCameraStatus: (cameraId: string, status: 'active' | 'inactive' | 'error') => 
    useStore.setState(state => ({
      detection: {
        ...state.detection,
        cameraStatuses: { ...state.detection.cameraStatuses, [cameraId]: status }
      }
    })),
    
  updateFrameIndex: (cameraId: string, frameIndex: number) => 
    useStore.setState(state => ({
      detection: {
        ...state.detection,
        frameIndices: { ...state.detection.frameIndices, [cameraId]: frameIndex }
      }
    })),
};

export const trackingActions = {
  updatePersonData: (personData: any) => 
    useStore.setState(state => ({ tracking: { ...state.tracking, persons: personData } })),
  
  setSelectedPerson: (personId: number | null) => 
    useStore.setState(state => ({ tracking: { ...state.tracking, selectedPersonId: personId } })),
};

export const mappingActions = {
  updateMapPoints: (points: any) => 
    useStore.setState(state => ({ mapping: { ...state.mapping, mapPoints: points } })),
  
  setMapDimensions: (dimensions: { width: number; height: number }) => 
    useStore.setState(state => ({ mapping: { ...state.mapping, mapDimensions: dimensions } })),
};