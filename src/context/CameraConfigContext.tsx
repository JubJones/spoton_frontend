import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BackendCameraId,
  DetectionProcessingEnvironment,
  DetectionProcessingEnvironmentCameraMetadata,
  DetectionProcessingEnvironmentsResponse,
  EnvironmentId,
} from '../types/api';
import { apiService } from '../services/apiService';
import { useUIStore } from '../stores/uiStore';
import { useTrackingStore } from '../stores/trackingStore';

interface CameraConfigContextValue {
  environmentCameras: Record<EnvironmentId, BackendCameraId[]>;
  cameraDisplayNames: Record<BackendCameraId, string>;
  cameraColors: Record<BackendCameraId, string>;
  cameraMetadata: Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>>;
  isLoading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  getCamerasForEnvironment: (environment: EnvironmentId) => BackendCameraId[];
  getDisplayName: (cameraId: BackendCameraId) => string;
  getColor: (cameraId: BackendCameraId) => string | undefined;
}

const CameraConfigContext = createContext<CameraConfigContextValue | undefined>(undefined);

const DEFAULT_ENVIRONMENT_CAMERAS: Record<EnvironmentId, BackendCameraId[]> = {
  campus: ['c01', 'c02', 'c03', 'c05'] as BackendCameraId[],
  factory: ['c09', 'c12', 'c13', 'c16'] as BackendCameraId[],
};

const DEFAULT_CAMERA_NAMES_BY_ENVIRONMENT: Record<EnvironmentId, Record<BackendCameraId, string>> = {
  campus: {
    c01: 'Campus Gate Camera',
    c02: 'Campus Plaza Camera',
    c03: 'Campus Walkway Camera',
    c05: 'Campus Commons Camera',
  },
  factory: {
    c09: 'Factory Camera 1 (Entrance)',
    c12: 'Factory Camera 2 (Assembly Line)',
    c13: 'Factory Camera 3 (Storage Area)',
    c16: 'Factory Camera 4 (Quality Control)',
  },
};

const DEFAULT_CAMERA_COLORS: Record<BackendCameraId, string> = {
  c01: 'bg-blue-400',
  c02: 'bg-green-500',
  c03: 'bg-orange-400',
  c05: 'bg-pink-500',
  c09: 'bg-cyan-400',
  c12: 'bg-red-500',
  c13: 'bg-yellow-400',
  c16: 'bg-purple-500',
};

function extractEnvironmentCameraData(
  payload: DetectionProcessingEnvironmentsResponse
): {
  camerasByEnvironment: Partial<Record<EnvironmentId, BackendCameraId[]>>;
  displayNames: Record<BackendCameraId, string>;
  metadata: Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>>;
} {
  const camerasByEnvironment: Partial<Record<EnvironmentId, BackendCameraId[]>> = {};
  const displayNames: Record<BackendCameraId, string> = {};
  const metadata: Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>> = {};

  payload.environments.forEach((environment: DetectionProcessingEnvironment) => {
    camerasByEnvironment[environment.environment_id] = environment.cameras;

    environment.cameras.forEach((cameraId) => {
      const environmentDefaults = DEFAULT_CAMERA_NAMES_BY_ENVIRONMENT[environment.environment_id];
      const fallbackName = environmentDefaults?.[cameraId] ?? cameraId;
      const backendName = environment.camera_metadata?.[cameraId]?.display_name;

      displayNames[cameraId] = backendName || fallbackName;

      if (environment.camera_metadata?.[cameraId]) {
        metadata[cameraId] = environment.camera_metadata[cameraId]!;
      }
    });
  });

  return { camerasByEnvironment, displayNames, metadata };
}

export const CameraConfigProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [environmentCameras, setEnvironmentCameras] = useState<Record<EnvironmentId, BackendCameraId[]>>(
    DEFAULT_ENVIRONMENT_CAMERAS
  );
  const [cameraDisplayNames, setCameraDisplayNames] = useState<Record<BackendCameraId, string>>(() => {
    const defaults: Record<BackendCameraId, string> = {};
    (Object.keys(DEFAULT_CAMERA_NAMES_BY_ENVIRONMENT) as EnvironmentId[]).forEach((env) => {
      const envEntries = DEFAULT_CAMERA_NAMES_BY_ENVIRONMENT[env];
      Object.entries(envEntries).forEach(([cameraId, name]) => {
        defaults[cameraId as BackendCameraId] = name;
      });
    });
    return defaults;
  });
  const [cameraMetadata, setCameraMetadata] = useState<
    Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const registerCamerasWithStores = useCallback(
    (camerasByEnvironment: Partial<Record<EnvironmentId, BackendCameraId[]>>) => {
      const uiActions = useUIStore.getState().actions;
      const trackingActions = useTrackingStore.getState().actions;

      Object.values(camerasByEnvironment).forEach((cameraList) => {
        if (!cameraList) return;
        uiActions.ensureCameraConfigs(cameraList);
        trackingActions.ensureCameraSlots(cameraList);
      });
    },
    []
  );

  useEffect(() => {
    registerCamerasWithStores(DEFAULT_ENVIRONMENT_CAMERAS);
  }, [registerCamerasWithStores]);

  const loadCameraConfig = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const payload = await apiService.getDetectionProcessingEnvironments();
      const { camerasByEnvironment, displayNames, metadata } = extractEnvironmentCameraData(payload);

      setEnvironmentCameras((prev) => ({
        ...prev,
        ...camerasByEnvironment,
      }));

      setCameraDisplayNames((prev) => ({
        ...prev,
        ...displayNames,
      }));

      setCameraMetadata((prev) => ({
        ...prev,
        ...metadata,
      }));

      registerCamerasWithStores(camerasByEnvironment);
    } catch (err) {
      console.error('Failed to load detection environments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load camera configuration');
    } finally {
      setIsLoading(false);
    }
  }, [registerCamerasWithStores]);

  useEffect(() => {
    loadCameraConfig();
  }, [loadCameraConfig]);

  const value = useMemo<CameraConfigContextValue>(
    () => ({
      environmentCameras,
      cameraDisplayNames,
      cameraColors: DEFAULT_CAMERA_COLORS,
      cameraMetadata,
      isLoading,
      error,
      refresh: loadCameraConfig,
      getCamerasForEnvironment: (environment: EnvironmentId) =>
        environmentCameras[environment] ?? [],
      getDisplayName: (cameraId: BackendCameraId) =>
        cameraDisplayNames[cameraId] ?? cameraId,
      getColor: (cameraId: BackendCameraId) => DEFAULT_CAMERA_COLORS[cameraId],
    }),
    [environmentCameras, cameraDisplayNames, cameraMetadata, isLoading, error, loadCameraConfig]
  );

  return (
    <CameraConfigContext.Provider value={value}>
      {children}
    </CameraConfigContext.Provider>
  );
};

export const useCameraConfig = (): CameraConfigContextValue => {
  const context = useContext(CameraConfigContext);
  if (!context) {
    throw new Error('useCameraConfig must be used within a CameraConfigProvider');
  }
  return context;
};

export const useEnvironmentCameras = (environment: EnvironmentId): BackendCameraId[] => {
  const { getCamerasForEnvironment } = useCameraConfig();
  return getCamerasForEnvironment(environment);
};

export const useCameraDisplayName = (cameraId?: BackendCameraId): string => {
  const { getDisplayName } = useCameraConfig();
  return cameraId ? getDisplayName(cameraId) : '';
};
