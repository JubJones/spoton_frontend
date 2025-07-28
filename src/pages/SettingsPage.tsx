import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from '../services/types/api';
import { useAppStore } from '../stores/appStore';
import { useDetectionStore } from '../stores/detectionStore';
import { useTrackingStore } from '../stores/trackingStore';
import { useMappingStore } from '../stores/mappingStore';
import { performanceMonitor } from '../services/performanceMonitor';
import { frameSynchronizer } from '../services/frameSynchronizer';
import { errorHandler } from '../services/errorHandler';
import { resilienceMonitor } from '../services/resilienceMonitor';

interface SettingsPageProps {
  className?: string;
}

interface AppSettings {
  // Display settings
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  
  // Performance settings
  maxFPS: number;
  qualityPreset: 'high' | 'medium' | 'low' | 'auto';
  enableHardwareAcceleration: boolean;
  bufferSize: number;
  syncEnabled: boolean;
  
  // Detection settings
  confidenceThreshold: number;
  enableAutoTracking: boolean;
  maxTrackingTargets: number;
  trackingTimeout: number;
  
  // Notification settings
  enableNotifications: boolean;
  notificationTypes: {
    newDetection: boolean;
    trackingLost: boolean;
    systemErrors: boolean;
    performanceAlerts: boolean;
  };
  
  // Camera settings
  cameraSettings: Record<string, CameraSettings>;
  
  // Map settings
  mapProvider: 'openstreetmap' | 'satellite' | 'hybrid';
  showTrajectories: boolean;
  trajectoryLength: number;
  showCameraFOV: boolean;
  
  // Security settings
  enableErrorReporting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  dataRetentionDays: number;
  
  // Accessibility settings
  enableHighContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  enableScreenReader: boolean;
  enableKeyboardShortcuts: boolean;
}

interface CameraSettings {
  enabled: boolean;
  quality: 'high' | 'medium' | 'low';
  fps: number;
  brightness: number;
  contrast: number;
  saturation: number;
  enableMotionDetection: boolean;
  motionSensitivity: number;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  maxFPS: 30,
  qualityPreset: 'auto',
  enableHardwareAcceleration: true,
  bufferSize: 10,
  syncEnabled: true,
  confidenceThreshold: 0.7,
  enableAutoTracking: false,
  maxTrackingTargets: 5,
  trackingTimeout: 30,
  enableNotifications: true,
  notificationTypes: {
    newDetection: true,
    trackingLost: true,
    systemErrors: true,
    performanceAlerts: false,
  },
  cameraSettings: {},
  mapProvider: 'openstreetmap',
  showTrajectories: true,
  trajectoryLength: 100,
  showCameraFOV: true,
  enableErrorReporting: true,
  logLevel: 'info',
  dataRetentionDays: 7,
  enableHighContrast: false,
  fontSize: 'medium',
  enableScreenReader: false,
  enableKeyboardShortcuts: true,
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'performance' | 'detection' | 'cameras' | 'notifications' | 'security' | 'accessibility'>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Store hooks
  const { currentEnvironment } = useAppStore();
  const { confidenceThreshold: detectionThreshold } = useDetectionStore();
  const { maxTrackingTargets: trackingLimit } = useTrackingStore();

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('spoton-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Handle setting changes
  const handleSettingChange = (
    section: keyof AppSettings,
    value: any,
    subsection?: string
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      
      if (subsection) {
        (newSettings[section] as any)[subsection] = value;
      } else {
        (newSettings as any)[section] = value;
      }
      
      return newSettings;
    });
    
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Validate settings
  const validateSettings = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate performance settings
    if (settings.maxFPS < 1 || settings.maxFPS > 60) {
      errors.maxFPS = 'FPS must be between 1 and 60';
    }

    if (settings.bufferSize < 1 || settings.bufferSize > 100) {
      errors.bufferSize = 'Buffer size must be between 1 and 100';
    }

    // Validate detection settings
    if (settings.confidenceThreshold < 0 || settings.confidenceThreshold > 1) {
      errors.confidenceThreshold = 'Confidence threshold must be between 0 and 1';
    }

    if (settings.maxTrackingTargets < 1 || settings.maxTrackingTargets > 20) {
      errors.maxTrackingTargets = 'Max tracking targets must be between 1 and 20';
    }

    if (settings.trackingTimeout < 5 || settings.trackingTimeout > 300) {
      errors.trackingTimeout = 'Tracking timeout must be between 5 and 300 seconds';
    }

    // Validate data retention
    if (settings.dataRetentionDays < 1 || settings.dataRetentionDays > 365) {
      errors.dataRetentionDays = 'Data retention must be between 1 and 365 days';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save settings
  const handleSave = async () => {
    if (!validateSettings()) {
      return;
    }

    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem('spoton-settings', JSON.stringify(settings));
      
      // Apply settings to services
      await applySettings(settings);
      
      setSaveSuccess(true);
      setHasChanges(false);
      
      // Auto-hide success message
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Handle error - could show error message
    } finally {
      setIsSaving(false);
    }
  };

  // Apply settings to services
  const applySettings = async (settings: AppSettings) => {
    // Apply performance settings
    performanceMonitor.updateConfig({
      enableAlerts: settings.enableNotifications && settings.notificationTypes.performanceAlerts,
      retryIntervals: [1000, 3000, 5000],
    });

    // Apply sync settings
    frameSynchronizer.updateConfig({
      maxBufferSize: settings.bufferSize,
      targetFPS: settings.maxFPS,
      enableFrameSkipping: settings.qualityPreset !== 'high',
    });

    // Apply error handling settings
    errorHandler.updateConfig({
      enableErrorReporting: settings.enableErrorReporting,
      enableAutomaticRecovery: true,
    });

    // Apply theme
    document.documentElement.setAttribute('data-theme', settings.theme);

    // Apply font size
    document.documentElement.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }[settings.fontSize];

    // Apply high contrast
    if (settings.enableHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings(defaultSettings);
      setHasChanges(true);
      setSaveSuccess(false);
      setValidationErrors({});
    }
  };

  // Export settings
  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `spoton-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import settings
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings({ ...defaultSettings, ...importedSettings });
        setHasChanges(true);
        setSaveSuccess(false);
      } catch (error) {
        console.error('Failed to import settings:', error);
        alert('Failed to import settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Tab navigation
  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'detection', label: 'Detection', icon: '🎯' },
    { id: 'cameras', label: 'Cameras', icon: '📹' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  ];

  // Render setting input with validation
  const renderInput = (
    key: string,
    value: any,
    onChange: (value: any) => void,
    type: 'text' | 'number' | 'range' | 'select' | 'checkbox' = 'text',
    options?: { value: any; label: string }[],
    min?: number,
    max?: number,
    step?: number
  ) => {
    const error = validationErrors[key];
    
    return (
      <div className="mb-4">
        {type === 'checkbox' ? (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="mr-2"
            />
            <span className={error ? 'text-red-400' : ''}>{key}</span>
          </label>
        ) : (
          <div>
            <label className={`block text-sm font-medium mb-1 ${error ? 'text-red-400' : 'text-gray-300'}`}>
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
            
            {type === 'select' ? (
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full p-2 bg-gray-700 text-white rounded border ${
                  error ? 'border-red-500' : 'border-gray-600'
                } focus:border-blue-500 focus:outline-none`}
              >
                {options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : type === 'range' ? (
              <div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => onChange(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{min}</span>
                  <span>{value}</span>
                  <span>{max}</span>
                </div>
              </div>
            ) : (
              <input
                type={type}
                value={value}
                onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                min={min}
                max={max}
                step={step}
                className={`w-full p-2 bg-gray-700 text-white rounded border ${
                  error ? 'border-red-500' : 'border-gray-600'
                } focus:border-blue-500 focus:outline-none`}
              />
            )}
            
            {error && (
              <p className="text-red-400 text-sm mt-1">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-700 rounded"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-yellow-400 text-sm">Unsaved changes</span>
            )}
            {saveSuccess && (
              <span className="text-green-400 text-sm">Settings saved!</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Import/Export */}
          <div className="mt-8 pt-4 border-t border-gray-700">
            <div className="space-y-2">
              <button
                onClick={handleExport}
                className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Export Settings
              </button>
              
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <span className="block w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-center cursor-pointer">
                  Import Settings
                </span>
              </label>
              
              <button
                onClick={handleReset}
                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">General Settings</h2>
              
              {renderInput('theme', settings.theme, 
                (value) => handleSettingChange('theme', value), 
                'select', [
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'auto', label: 'Auto' },
                ]
              )}
              
              {renderInput('language', settings.language, 
                (value) => handleSettingChange('language', value), 
                'select', [
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'de', label: 'German' },
                  { value: 'ja', label: 'Japanese' },
                  { value: 'zh', label: 'Chinese' },
                ]
              )}
              
              {renderInput('dateFormat', settings.dateFormat, 
                (value) => handleSettingChange('dateFormat', value), 
                'select', [
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                ]
              )}
              
              {renderInput('timeFormat', settings.timeFormat, 
                (value) => handleSettingChange('timeFormat', value), 
                'select', [
                  { value: '12h', label: '12 Hour' },
                  { value: '24h', label: '24 Hour' },
                ]
              )}
            </div>
          )}

          {/* Performance Settings */}
          {activeTab === 'performance' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Performance Settings</h2>
              
              {renderInput('maxFPS', settings.maxFPS, 
                (value) => handleSettingChange('maxFPS', value), 
                'range', undefined, 5, 60, 5
              )}
              
              {renderInput('qualityPreset', settings.qualityPreset, 
                (value) => handleSettingChange('qualityPreset', value), 
                'select', [
                  { value: 'high', label: 'High Quality' },
                  { value: 'medium', label: 'Medium Quality' },
                  { value: 'low', label: 'Low Quality' },
                  { value: 'auto', label: 'Auto' },
                ]
              )}
              
              {renderInput('bufferSize', settings.bufferSize, 
                (value) => handleSettingChange('bufferSize', value), 
                'range', undefined, 1, 50, 1
              )}
              
              {renderInput('enableHardwareAcceleration', settings.enableHardwareAcceleration, 
                (value) => handleSettingChange('enableHardwareAcceleration', value), 
                'checkbox'
              )}
              
              {renderInput('syncEnabled', settings.syncEnabled, 
                (value) => handleSettingChange('syncEnabled', value), 
                'checkbox'
              )}
            </div>
          )}

          {/* Detection Settings */}
          {activeTab === 'detection' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Detection Settings</h2>
              
              {renderInput('confidenceThreshold', settings.confidenceThreshold, 
                (value) => handleSettingChange('confidenceThreshold', value), 
                'range', undefined, 0, 1, 0.1
              )}
              
              {renderInput('maxTrackingTargets', settings.maxTrackingTargets, 
                (value) => handleSettingChange('maxTrackingTargets', value), 
                'range', undefined, 1, 20, 1
              )}
              
              {renderInput('trackingTimeout', settings.trackingTimeout, 
                (value) => handleSettingChange('trackingTimeout', value), 
                'range', undefined, 5, 300, 5
              )}
              
              {renderInput('enableAutoTracking', settings.enableAutoTracking, 
                (value) => handleSettingChange('enableAutoTracking', value), 
                'checkbox'
              )}
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
              
              {renderInput('enableNotifications', settings.enableNotifications, 
                (value) => handleSettingChange('enableNotifications', value), 
                'checkbox'
              )}
              
              {settings.enableNotifications && (
                <div className="ml-4 space-y-2">
                  {Object.entries(settings.notificationTypes).map(([key, value]) => (
                    <div key={key}>
                      {renderInput(key, value, 
                        (newValue) => handleSettingChange('notificationTypes', newValue, key), 
                        'checkbox'
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
              
              {renderInput('enableErrorReporting', settings.enableErrorReporting, 
                (value) => handleSettingChange('enableErrorReporting', value), 
                'checkbox'
              )}
              
              {renderInput('logLevel', settings.logLevel, 
                (value) => handleSettingChange('logLevel', value), 
                'select', [
                  { value: 'debug', label: 'Debug' },
                  { value: 'info', label: 'Info' },
                  { value: 'warn', label: 'Warning' },
                  { value: 'error', label: 'Error' },
                ]
              )}
              
              {renderInput('dataRetentionDays', settings.dataRetentionDays, 
                (value) => handleSettingChange('dataRetentionDays', value), 
                'range', undefined, 1, 365, 1
              )}
            </div>
          )}

          {/* Accessibility Settings */}
          {activeTab === 'accessibility' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Accessibility Settings</h2>
              
              {renderInput('enableHighContrast', settings.enableHighContrast, 
                (value) => handleSettingChange('enableHighContrast', value), 
                'checkbox'
              )}
              
              {renderInput('fontSize', settings.fontSize, 
                (value) => handleSettingChange('fontSize', value), 
                'select', [
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]
              )}
              
              {renderInput('enableScreenReader', settings.enableScreenReader, 
                (value) => handleSettingChange('enableScreenReader', value), 
                'checkbox'
              )}
              
              {renderInput('enableKeyboardShortcuts', settings.enableKeyboardShortcuts, 
                (value) => handleSettingChange('enableKeyboardShortcuts', value), 
                'checkbox'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;