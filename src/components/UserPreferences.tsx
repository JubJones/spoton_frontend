// src/components/UserPreferences.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { EnvironmentId } from '../types/api';

interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto';
  colorScheme: 'blue' | 'orange' | 'purple' | 'green';
  backgroundStyle: 'gradient' | 'solid' | 'particles';
  customColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface DisplaySettings {
  gridLayout: '2x2' | '1x4' | '4x1' | 'custom';
  showBoundingBoxes: boolean;
  showPersonIds: boolean;
  showConfidenceScores: boolean;
  showTimestamps: boolean;
  autoHideUI: boolean;
  compactMode: boolean;
  highContrastMode: boolean;
}

interface NotificationSettings {
  enableSounds: boolean;
  soundVolume: number;
  enableVisualAlerts: boolean;
  notificationPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoHideDelay: number;
  enableDesktopNotifications: boolean;
}

interface PerformanceSettings {
  enableAnimations: boolean;
  reducedMotion: boolean;
  autoRefreshInterval: number;
  enablePreloading: boolean;
  maxConcurrentRequests: number;
  enableDebugMode: boolean;
}

interface UserPreferencesConfig {
  theme: ThemeSettings;
  display: DisplaySettings;
  notifications: NotificationSettings;
  performance: PerformanceSettings;
  language: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
}

interface UserPreferencesProps {
  environment: EnvironmentId;
  isConnected: boolean;
  onSettingsChange: () => void;
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
}

const UserPreferences: React.FC<UserPreferencesProps> = ({
  environment: _environment,
  isConnected: _isConnected,
  onSettingsChange,
  hasUnsavedChanges,
  isSubmitting: _isSubmitting,
}) => {
  // Default preferences
  const defaultPreferences: UserPreferencesConfig = useMemo(
    () => ({
      theme: {
        mode: 'dark',
        colorScheme: 'orange',
        backgroundStyle: 'gradient',
        customColors: {
          primary: '#ea580c',
          secondary: '#1e40af',
          accent: '#7c3aed',
        },
      },
      display: {
        gridLayout: '2x2',
        showBoundingBoxes: true,
        showPersonIds: true,
        showConfidenceScores: false,
        showTimestamps: true,
        autoHideUI: false,
        compactMode: false,
        highContrastMode: false,
      },
      notifications: {
        enableSounds: true,
        soundVolume: 50,
        enableVisualAlerts: true,
        notificationPosition: 'top-right',
        autoHideDelay: 5000,
        enableDesktopNotifications: true,
      },
      performance: {
        enableAnimations: true,
        reducedMotion: false,
        autoRefreshInterval: 30,
        enablePreloading: true,
        maxConcurrentRequests: 6,
        enableDebugMode: false,
      },
      language: 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
    }),
    []
  );

  const [preferences, setPreferences] = useState<UserPreferencesConfig>(defaultPreferences);
  const [previewMode, setPreviewMode] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('spoton-user-preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }
  }, [defaultPreferences]);

  // Save preferences to localStorage
  const savePreferences = useCallback(() => {
    localStorage.setItem('spoton-user-preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Handle preference changes
  const handlePreferenceChange = useCallback(
    (section: keyof UserPreferencesConfig, key: string, value: unknown) => {
      if (typeof preferences[section] === 'object' && preferences[section] !== null) {
        setPreferences((prev) => ({
          ...prev,
          [section]: {
            ...(prev[section] as any),
            [key]: value,
          },
        }));
      } else {
        setPreferences((prev) => ({
          ...prev,
          [section]: value,
        }));
      }
      onSettingsChange();
    },
    [preferences, onSettingsChange]
  );

  // Handle nested preference changes (for custom colors)
  const handleNestedPreferenceChange = useCallback(
    (section: keyof UserPreferencesConfig, parentKey: string, key: string, value: unknown) => {
      setPreferences((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [parentKey]: {
            ...(prev[section] as any)[parentKey],
            [key]: value,
          },
        },
      }));
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Apply theme preview
  const applyThemePreview = useCallback(() => {
    if (previewMode) {
      document.documentElement.style.setProperty(
        '--primary-color',
        preferences.theme.customColors.primary
      );
      document.documentElement.style.setProperty(
        '--secondary-color',
        preferences.theme.customColors.secondary
      );
      document.documentElement.style.setProperty(
        '--accent-color',
        preferences.theme.customColors.accent
      );
    }
  }, [previewMode, preferences.theme.customColors]);

  // Test notification
  const testNotification = useCallback(() => {
    if (preferences.notifications.enableDesktopNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('SpotOn Test Notification', {
          body: 'This is a test notification from SpotOn settings.',
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('SpotOn Test Notification', {
              body: 'This is a test notification from SpotOn settings.',
              icon: '/favicon.ico',
            });
          }
        });
      }
    }

    // Show visual alert
    if (preferences.notifications.enableVisualAlerts) {
      // This would trigger a visual notification in the UI
      console.log('Visual notification test');
    }

    // Play sound
    if (preferences.notifications.enableSounds) {
      // This would play a notification sound
      console.log('Sound notification test');
    }
  }, [preferences.notifications]);

  // Reset preferences
  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    localStorage.removeItem('spoton-user-preferences');
    onSettingsChange();
  }, [defaultPreferences, onSettingsChange]);

  // Export preferences
  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spoton-preferences-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [preferences]);

  // Import preferences
  const importPreferences = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedPreferences = JSON.parse(e.target?.result as string);
            setPreferences({ ...defaultPreferences, ...importedPreferences });
            onSettingsChange();
          } catch (error) {
            console.error('Failed to import preferences:', error);
            alert('Invalid preferences file format');
          }
        };
        reader.readAsText(file);
      }
    },
    [defaultPreferences, onSettingsChange]
  );

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">User Preferences</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={savePreferences}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            💾 Save Locally
          </button>
          <button
            onClick={exportPreferences}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            📤 Export
          </button>
          <label className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm cursor-pointer">
            📥 Import
            <input type="file" accept=".json" onChange={importPreferences} className="hidden" />
          </label>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Theme & Appearance</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme Mode</label>
            <select
              value={preferences.theme.mode}
              onChange={(e) => handlePreferenceChange('theme', 'mode', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color Scheme</label>
            <select
              value={preferences.theme.colorScheme}
              onChange={(e) => handlePreferenceChange('theme', 'colorScheme', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="blue">Blue</option>
              <option value="orange">Orange (Default)</option>
              <option value="purple">Purple</option>
              <option value="green">Green</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Background Style</label>
            <select
              value={preferences.theme.backgroundStyle}
              onChange={(e) => handlePreferenceChange('theme', 'backgroundStyle', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="gradient">Gradient</option>
              <option value="solid">Solid Color</option>
              <option value="particles">Particles</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="previewMode"
              checked={previewMode}
              onChange={(e) => setPreviewMode(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="previewMode" className="text-sm text-gray-300">
              Enable theme preview
            </label>
          </div>
        </div>

        {/* Custom Colors */}
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-300">Custom Colors</h5>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Primary</label>
              <input
                type="color"
                value={preferences.theme.customColors.primary}
                onChange={(e) =>
                  handleNestedPreferenceChange('theme', 'customColors', 'primary', e.target.value)
                }
                className="w-full h-8 rounded border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Secondary</label>
              <input
                type="color"
                value={preferences.theme.customColors.secondary}
                onChange={(e) =>
                  handleNestedPreferenceChange('theme', 'customColors', 'secondary', e.target.value)
                }
                className="w-full h-8 rounded border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Accent</label>
              <input
                type="color"
                value={preferences.theme.customColors.accent}
                onChange={(e) =>
                  handleNestedPreferenceChange('theme', 'customColors', 'accent', e.target.value)
                }
                className="w-full h-8 rounded border border-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Display Settings</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Grid Layout</label>
            <select
              value={preferences.display.gridLayout}
              onChange={(e) => handlePreferenceChange('display', 'gridLayout', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="2x2">2x2 Grid</option>
              <option value="1x4">1x4 Horizontal</option>
              <option value="4x1">4x1 Vertical</option>
              <option value="custom">Custom Layout</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Display Options</label>
            <div className="space-y-1">
              {[
                { key: 'showBoundingBoxes', label: 'Show bounding boxes' },
                { key: 'showPersonIds', label: 'Show person IDs' },
                { key: 'showConfidenceScores', label: 'Show confidence scores' },
                { key: 'showTimestamps', label: 'Show timestamps' },
                { key: 'autoHideUI', label: 'Auto-hide UI elements' },
                { key: 'compactMode', label: 'Compact mode' },
                { key: 'highContrastMode', label: 'High contrast mode' },
              ].map((option) => (
                <div key={option.key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={option.key}
                    checked={preferences.display[option.key as keyof DisplaySettings] as boolean}
                    onChange={(e) =>
                      handlePreferenceChange('display', option.key, e.target.checked)
                    }
                    className="rounded"
                  />
                  <label htmlFor={option.key} className="text-sm text-gray-300">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-semibold text-white">Notification Settings</h4>
          <button
            onClick={testNotification}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
          >
            🔔 Test Notifications
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sound Volume: {preferences.notifications.soundVolume}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={preferences.notifications.soundVolume}
              onChange={(e) =>
                handlePreferenceChange('notifications', 'soundVolume', parseInt(e.target.value))
              }
              className="w-full"
              disabled={!preferences.notifications.enableSounds}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notification Position
            </label>
            <select
              value={preferences.notifications.notificationPosition}
              onChange={(e) =>
                handlePreferenceChange('notifications', 'notificationPosition', e.target.value)
              }
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-right">Bottom Right</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Auto-hide Delay: {preferences.notifications.autoHideDelay / 1000}s
            </label>
            <input
              type="range"
              min={1000}
              max={30000}
              step={1000}
              value={preferences.notifications.autoHideDelay}
              onChange={(e) =>
                handlePreferenceChange('notifications', 'autoHideDelay', parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            {[
              { key: 'enableSounds', label: 'Enable notification sounds' },
              { key: 'enableVisualAlerts', label: 'Enable visual alerts' },
              { key: 'enableDesktopNotifications', label: 'Enable desktop notifications' },
            ].map((option) => (
              <div key={option.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={option.key}
                  checked={
                    preferences.notifications[option.key as keyof NotificationSettings] as boolean
                  }
                  onChange={(e) =>
                    handlePreferenceChange('notifications', option.key, e.target.checked)
                  }
                  className="rounded"
                />
                <label htmlFor={option.key} className="text-sm text-gray-300">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Performance & Behavior</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Auto-refresh Interval: {preferences.performance.autoRefreshInterval}s
            </label>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={preferences.performance.autoRefreshInterval}
              onChange={(e) =>
                handlePreferenceChange(
                  'performance',
                  'autoRefreshInterval',
                  parseInt(e.target.value)
                )
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Concurrent Requests: {preferences.performance.maxConcurrentRequests}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={preferences.performance.maxConcurrentRequests}
              onChange={(e) =>
                handlePreferenceChange(
                  'performance',
                  'maxConcurrentRequests',
                  parseInt(e.target.value)
                )
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            {[
              { key: 'enableAnimations', label: 'Enable animations' },
              { key: 'reducedMotion', label: 'Reduced motion (accessibility)' },
              { key: 'enablePreloading', label: 'Enable data preloading' },
              { key: 'enableDebugMode', label: 'Enable debug mode' },
            ].map((option) => (
              <div key={option.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={option.key}
                  checked={
                    preferences.performance[option.key as keyof PerformanceSettings] as boolean
                  }
                  onChange={(e) =>
                    handlePreferenceChange('performance', option.key, e.target.checked)
                  }
                  className="rounded"
                />
                <label htmlFor={option.key} className="text-sm text-gray-300">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Localization Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Localization & Format</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
            <select
              value={preferences.language}
              onChange={(e) => handlePreferenceChange('language', '', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Español</option>
              <option value="fr-FR">Français</option>
              <option value="de-DE">Deutsch</option>
              <option value="ja-JP">日本語</option>
              <option value="zh-CN">中文 (简体)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
            <select
              value={preferences.timezone}
              onChange={(e) => handlePreferenceChange('timezone', '', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">GMT</option>
              <option value="Europe/Paris">CET</option>
              <option value="Asia/Tokyo">JST</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date Format</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => handlePreferenceChange('dateFormat', '', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Time Format</label>
            <select
              value={preferences.timeFormat}
              onChange={(e) => handlePreferenceChange('timeFormat', '', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <button
          onClick={resetPreferences}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
        >
          Reset to Defaults
        </button>

        <div className="text-sm text-gray-400">
          {hasUnsavedChanges ? (
            <span className="text-orange-400">⚠️ Unsaved changes</span>
          ) : (
            <span className="text-green-400">✅ Preferences saved locally</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPreferences;
