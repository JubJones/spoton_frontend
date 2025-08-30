// src/pages/SettingsPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import SystemSettings from '../components/SystemSettings';
import UserPreferences from '../components/UserPreferences';
import CameraSettings from '../components/CameraSettings';
import AlertSettings from '../components/AlertSettings';
import ExportSettings from '../components/ExportSettings';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import { MOCK_CONFIG } from '../config/mock';
import type { EnvironmentId } from '../types/api';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  component: React.ComponentType<any>;
  requiresBackend?: boolean;
}

const SettingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const environment = (searchParams.get('environment') || 'factory') as EnvironmentId;
  const [activeSection, setActiveSection] = useState<string>('system');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isConnected, backendStatus, error } = useSpotOnBackend();

  // Create connection status for Header component
  const connectionStatus = {
    isConnected,
    statusText: isConnected ? backendStatus.status : 'Disconnected',
  };

  // Settings sections configuration
  const settingsSections: SettingsSection[] = useMemo(
    () => [
      {
        id: 'system',
        title: 'System Settings',
        description: 'Core system settings and backend configuration',
        icon: '⚙️',
        component: SystemSettings,
        requiresBackend: true,
      },
      {
        id: 'cameras',
        title: 'Camera Configuration',
        description: 'Camera configuration and detection parameters',
        icon: '📹',
        component: CameraSettings,
        requiresBackend: true,
      },
      {
        id: 'detection',
        title: 'Detection Settings',
        description: 'Person detection and tracking parameters',
        icon: '🎯',
        component: CameraSettings,
        requiresBackend: true,
      },
      {
        id: 'preferences',
        title: 'User Preferences',
        description: 'UI customization and display preferences',
        icon: '👤',
        component: UserPreferences,
        requiresBackend: false,
      },
      {
        id: 'alerts',
        title: 'Alert Preferences',
        description: 'Notification and alert configuration',
        icon: '🔔',
        component: AlertSettings,
        requiresBackend: true,
      },
      {
        id: 'export',
        title: 'Export Settings',
        description: 'Data export and backup configuration',
        icon: '📊',
        component: ExportSettings,
        requiresBackend: false,
      },
    ],
    []
  );

  // Get current section
  const currentSection = settingsSections.find((section) => section.id === activeSection);

  // Handle section change with unsaved changes check
  const handleSectionChange = useCallback(
    (sectionId: string) => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to switch sections?'
        );
        if (!confirmed) return;
        setHasUnsavedChanges(false);
      }
      setActiveSection(sectionId);
    },
    [hasUnsavedChanges]
  );

  // Handle settings change
  const handleSettingsChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Handle save settings
  const handleSaveSettings = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Handle reset settings
  const handleResetSettings = useCallback(() => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all settings to default values? This action cannot be undone.'
    );
    if (confirmed) {
      setHasUnsavedChanges(false);
      console.log('Settings reset to defaults');
    }
  }, []);

  // Handle export settings
  const handleExportSettings = useCallback(() => {
    const settings = {
      timestamp: new Date().toISOString(),
      environment,
      sections: settingsSections.map((section) => ({
        id: section.id,
        title: section.title,
        // In real implementation, would include actual settings data
      })),
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spoton-settings-${environment}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [environment, settingsSections]);

  // Get section status (mock-aware)
  const getSectionStatus = useCallback(
    (section: SettingsSection) => {
      // In mock mode, all sections are available
      if (MOCK_CONFIG.enabled) {
        return { available: true, reason: null };
      }
      
      if (section.requiresBackend && !isConnected) {
        return { available: false, reason: 'Backend connection required' };
      }
      return { available: true, reason: null };
    },
    [isConnected]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Header
        environment={environment}
        connectionStatus={connectionStatus}
        showBackButton={true}
        backText="← Back to Dashboard"
        backUrl={`/group-view?environment=${environment}`}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
              <p className="text-gray-400">
                Configure system settings and preferences for{' '}
                {environment === 'factory' ? 'Factory' : 'Campus'} environment
              </p>
            </div>

            {/* Global Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportSettings}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center space-x-2"
              >
                <span>📤</span>
                <span>Export Settings</span>
              </button>

              <button
                onClick={handleResetSettings}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>Reset All</span>
              </button>

              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveSettings}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm flex items-center space-x-2"
                >
                  <span>{isSubmitting ? '⏳' : '💾'}</span>
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Connection Warning */}
          {!isConnected && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                <span>
                  <strong>Limited Functionality:</strong> Some settings require backend connection.
                  Features marked with 🔌 are currently unavailable.
                </span>
              </div>
            </div>
          )}

          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && (
            <div className="bg-orange-500/20 border border-orange-500 text-orange-200 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span>
                  <strong>Unsaved Changes:</strong> You have modified settings that haven't been
                  saved yet.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Settings Navigation Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Settings Categories</h3>
              <nav className="space-y-2">
                {settingsSections.map((section) => {
                  const status = getSectionStatus(section);
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      disabled={!status.available}
                      data-testid={`settings-section-${section.id}`}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center space-x-3 ${
                        isActive
                          ? 'bg-orange-500 text-white'
                          : status.available
                            ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                            : 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-xl">{section.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{section.title}</span>
                          {section.requiresBackend && !isConnected && (
                            <span className="text-xs">🔌</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{section.description}</p>
                        {!status.available && (
                          <p className="text-xs text-red-400 mt-1">{status.reason}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg">
              {/* Section Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{currentSection?.icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{currentSection?.title}</h2>
                    <p className="text-gray-400 text-sm">{currentSection?.description}</p>
                  </div>
                </div>
              </div>

              {/* Section Content */}
              <div className="p-6">
                {currentSection && (
                  <currentSection.component
                    environment={environment}
                    isConnected={isConnected}
                    onSettingsChange={handleSettingsChange}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isSubmitting={isSubmitting}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
