// src/components/ExportSettings.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { EnvironmentId } from '../types/api';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'csv' | 'json' | 'xml' | 'pdf' | 'excel';
  fields: string[];
  filters: {
    dateRange: boolean;
    cameraSelection: boolean;
    confidenceThreshold: boolean;
    personIdFilter: boolean;
  };
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

interface BackupConfiguration {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  retentionPeriod: number; // days
  destination: 'local' | 's3' | 'ftp' | 'cloud';
  compression: boolean;
  encryption: boolean;
  includeImages: boolean;
  includeAnalytics: boolean;
  maxBackupSize: number; // MB
}

interface DataRetentionPolicy {
  trackingData: number; // days
  personImages: number; // days
  analyticsData: number; // days
  systemLogs: number; // days
  exportedFiles: number; // days
  autoCleanup: boolean;
  compressionAfter: number; // days
}

interface ExportSettingsProps {
  environment: EnvironmentId;
  isConnected: boolean;
  onSettingsChange: () => void;
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
}

const ExportSettings: React.FC<ExportSettingsProps> = ({
  environment: _environment,
  isConnected: _isConnected,
  onSettingsChange,
  hasUnsavedChanges: _hasUnsavedChanges,
  isSubmitting: _isSubmitting,
}) => {
  // Default export templates
  const defaultTemplates: ExportTemplate[] = useMemo(
    () => [
      {
        id: 'daily_summary',
        name: 'Daily Summary Report',
        description: 'Complete daily tracking summary with person counts and analytics',
        format: 'pdf',
        fields: [
          'timestamp',
          'camera_id',
          'person_count',
          'unique_persons',
          'avg_dwell_time',
          'peak_occupancy',
        ],
        filters: {
          dateRange: true,
          cameraSelection: true,
          confidenceThreshold: true,
          personIdFilter: false,
        },
        schedule: {
          enabled: true,
          frequency: 'daily',
          time: '08:00',
          recipients: ['admin@company.com'],
        },
        createdAt: new Date(),
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
        useCount: 15,
      },
      {
        id: 'tracking_data_export',
        name: 'Tracking Data Export',
        description: 'Raw tracking data for analysis and integration',
        format: 'csv',
        fields: [
          'timestamp',
          'camera_id',
          'person_id',
          'bounding_box',
          'confidence',
          'position_x',
          'position_y',
        ],
        filters: {
          dateRange: true,
          cameraSelection: true,
          confidenceThreshold: true,
          personIdFilter: true,
        },
        createdAt: new Date(),
        lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        useCount: 8,
      },
      {
        id: 'analytics_report',
        name: 'Analytics Report',
        description: 'Comprehensive analytics with charts and insights',
        format: 'excel',
        fields: [
          'date',
          'total_detections',
          'unique_persons',
          'avg_dwell_time',
          'traffic_flow',
          'occupancy_peaks',
          'camera_performance',
        ],
        filters: {
          dateRange: true,
          cameraSelection: true,
          confidenceThreshold: false,
          personIdFilter: false,
        },
        schedule: {
          enabled: true,
          frequency: 'weekly',
          time: '09:00',
          recipients: ['analytics@company.com', 'manager@company.com'],
        },
        createdAt: new Date(),
        useCount: 3,
      },
    ],
    []
  );

  // Default backup configuration
  const defaultBackupConfig: BackupConfiguration = useMemo(
    () => ({
      enabled: true,
      frequency: 'daily',
      retentionPeriod: 30,
      destination: 'local',
      compression: true,
      encryption: false,
      includeImages: false,
      includeAnalytics: true,
      maxBackupSize: 1024,
    }),
    []
  );

  // Default retention policy
  const defaultRetentionPolicy: DataRetentionPolicy = useMemo(
    () => ({
      trackingData: 90,
      personImages: 30,
      analyticsData: 365,
      systemLogs: 180,
      exportedFiles: 60,
      autoCleanup: true,
      compressionAfter: 30,
    }),
    []
  );

  const [exportTemplates, setExportTemplates] = useState<ExportTemplate[]>(defaultTemplates);
  const [backupConfig, setBackupConfig] = useState<BackupConfiguration>(defaultBackupConfig);
  const [retentionPolicy, setRetentionPolicy] =
    useState<DataRetentionPolicy>(defaultRetentionPolicy);
  const [activeTab, setActiveTab] = useState<'templates' | 'backup' | 'retention' | 'privacy'>(
    'templates'
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // Handle template changes
  const handleTemplateChange = useCallback(
    (templateId: string, key: string, value: unknown) => {
      setExportTemplates((prev) =>
        prev.map((template) =>
          template.id === templateId
            ? {
              ...template,
              [key as keyof ExportTemplate]:
                typeof template[key as keyof ExportTemplate] === 'object'
                  ? { ...(template[key as keyof ExportTemplate] as any), ...(value as any) }
                  : value,
            }
            : template
        )
      );
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Handle backup config changes
  const handleBackupConfigChange = useCallback(
    (key: string, value: unknown) => {
      setBackupConfig((prev) => ({ ...prev, [key]: value }));
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Handle retention policy changes
  const handleRetentionPolicyChange = useCallback(
    (key: string, value: unknown) => {
      setRetentionPolicy((prev) => ({ ...prev, [key]: value }));
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Create new template
  const createNewTemplate = useCallback(() => {
    const newTemplate: ExportTemplate = {
      id: `template_${Date.now()}`,
      name: 'New Export Template',
      description: 'Custom export template',
      format: 'csv',
      fields: ['timestamp', 'camera_id', 'person_count'],
      filters: {
        dateRange: true,
        cameraSelection: false,
        confidenceThreshold: false,
        personIdFilter: false,
      },
      createdAt: new Date(),
      useCount: 0,
    };

    setExportTemplates((prev) => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate.id);
    setIsCreatingTemplate(false);
    onSettingsChange();
  }, [onSettingsChange]);

  // Delete template
  const deleteTemplate = useCallback(
    (templateId: string) => {
      setExportTemplates((prev) => prev.filter((template) => template.id !== templateId));
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
      }
      onSettingsChange();
    },
    [selectedTemplate, onSettingsChange]
  );

  // Export template - generates a downloadable file
  const exportTemplate = useCallback((template: ExportTemplate) => {
    // Update use count and last used
    setExportTemplates((prev) =>
      prev.map((t) =>
        t.id === template.id ? { ...t, useCount: t.useCount + 1, lastUsed: new Date() } : t
      )
    );

    // Generate export content based on format
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    let content: string;
    let mimeType: string;
    let fileExtension: string;

    if (template.format === 'json') {
      const data = {
        export_template: template.name,
        exported_at: timestamp,
        fields: template.fields,
        data: [] as Record<string, string>[],
        note: 'Export generated from SpotOn tracking system',
      };
      // Add a sample row showing the field structure
      const sampleRow: Record<string, string> = {};
      template.fields.forEach(field => { sampleRow[field] = `<${field}>`; });
      data.data.push(sampleRow);
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      fileExtension = 'json';
    } else {
      // Default to CSV for csv, excel, and other formats
      const header = template.fields.join(',');
      const sampleRow = template.fields.map(f => `<${f}>`).join(',');
      content = `# SpotOn Export - ${template.name}\n# Exported: ${timestamp}\n${header}\n${sampleRow}\n`;
      mimeType = 'text/csv';
      fileExtension = template.format === 'excel' ? 'csv' : template.format === 'xml' ? 'xml' : 'csv';

      if (template.format === 'xml') {
        content = `<?xml version="1.0" encoding="UTF-8"?>\n<export template="${template.name}" exported_at="${timestamp}">\n  <fields>${template.fields.map(f => `\n    <field name="${f}" />`).join('')}\n  </fields>\n  <data>\n    <row>${template.fields.map(f => `\n      <${f}></${f}>`).join('')}\n    </row>\n  </data>\n</export>\n`;
        mimeType = 'application/xml';
      }
    }

    // Trigger browser download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spoton_export_${template.id}_${dateStr}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Test backup
  const testBackup = useCallback(async () => {
    console.log('Testing backup configuration');
    // Simulate backup test
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Backup test completed');
  }, []);

  // Manual cleanup
  const manualCleanup = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to run manual cleanup? This will permanently delete old data according to your retention policy.'
    );
    if (confirmed) {
      console.log('Running manual cleanup');
      // Simulate cleanup process
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log('Cleanup completed');
    }
  }, []);

  // Get format icon
  const getFormatIcon = useCallback((format: ExportTemplate['format']) => {
    switch (format) {
      case 'csv':
        return '📊';
      case 'json':
        return '🔧';
      case 'xml':
        return '🏷️';
      case 'pdf':
        return '📄';
      case 'excel':
        return '📈';
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Export & Data Management</h3>
          <p className="text-sm text-gray-400">
            Configure data exports, backups, and retention policies
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreatingTemplate(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            ➕ New Template
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1">
        {[
          { key: 'templates', label: 'Export Templates', icon: '📋' },
          { key: 'backup', label: 'Backup Settings', icon: '💾' },
          { key: 'retention', label: 'Retention Policy', icon: '🗂️' },
          { key: 'privacy', label: 'Privacy & Compliance', icon: '🔒' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${activeTab === tab.key
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Templates List */}
            <div className="lg:col-span-1 space-y-3">
              <h4 className="text-md font-semibold text-white">
                Export Templates ({exportTemplates.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {exportTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedTemplate === template.id
                      ? 'border-orange-400 bg-orange-500/10'
                      : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                      }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getFormatIcon(template.format)}</span>
                        <span className="text-white font-medium text-sm">{template.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportTemplate(template);
                        }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                      >
                        Export
                      </button>
                    </div>

                    <div className="text-xs text-gray-400 space-y-1">
                      <div>{template.description}</div>
                      <div>Format: {template.format.toUpperCase()}</div>
                      <div>Used: {template.useCount} times</div>
                      {template.lastUsed && (
                        <div>Last: {template.lastUsed.toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                ))}

                {isCreatingTemplate && (
                  <div className="p-3 border-2 border-dashed border-orange-400 rounded-lg">
                    <div className="text-center">
                      <button
                        onClick={createNewTemplate}
                        className="text-orange-400 hover:text-orange-300 font-medium"
                      >
                        Create New Template
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Details */}
            <div className="lg:col-span-2">
              {selectedTemplate ? (
                (() => {
                  const template = exportTemplates.find((t) => t.id === selectedTemplate);
                  if (!template) return null;

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-white">Template Configuration</h4>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      {/* Basic Settings */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Template Name
                            </label>
                            <input
                              type="text"
                              value={template.name}
                              onChange={(e) =>
                                handleTemplateChange(template.id, 'name', e.target.value)
                              }
                              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Export Format
                            </label>
                            <select
                              value={template.format}
                              onChange={(e) =>
                                handleTemplateChange(template.id, 'format', e.target.value)
                              }
                              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                            >
                              <option value="csv">CSV</option>
                              <option value="json">JSON</option>
                              <option value="xml">XML</option>
                              <option value="pdf">PDF</option>
                              <option value="excel">Excel</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                          </label>
                          <textarea
                            value={template.description}
                            onChange={(e) =>
                              handleTemplateChange(template.id, 'description', e.target.value)
                            }
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                          />
                        </div>
                      </div>

                      {/* Fields Selection */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-gray-300">Export Fields</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            'timestamp',
                            'camera_id',
                            'person_id',
                            'person_count',
                            'unique_persons',
                            'bounding_box',
                            'confidence',
                            'position_x',
                            'position_y',
                            'avg_dwell_time',
                            'peak_occupancy',
                            'traffic_flow',
                            'camera_performance',
                          ].map((field) => (
                            <div key={field} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${template.id}_${field}`}
                                checked={template.fields.includes(field)}
                                onChange={(e) => {
                                  const newFields = e.target.checked
                                    ? [...template.fields, field]
                                    : template.fields.filter((f) => f !== field);
                                  handleTemplateChange(template.id, 'fields', newFields);
                                }}
                                className="rounded"
                              />
                              <label
                                htmlFor={`${template.id}_${field}`}
                                className="text-sm text-gray-300"
                              >
                                {field.replace(/_/g, ' ')}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-gray-300">Export Filters</h5>
                        <div className="space-y-2">
                          {[
                            { key: 'dateRange', label: 'Date range selection' },
                            { key: 'cameraSelection', label: 'Camera selection' },
                            { key: 'confidenceThreshold', label: 'Confidence threshold' },
                            { key: 'personIdFilter', label: 'Person ID filter' },
                          ].map((filter) => (
                            <div key={filter.key} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${template.id}_filter_${filter.key}`}
                                checked={
                                  template.filters[filter.key as keyof typeof template.filters]
                                }
                                onChange={(e) =>
                                  handleTemplateChange(template.id, 'filters', {
                                    ...template.filters,
                                    [filter.key]: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              <label
                                htmlFor={`${template.id}_filter_${filter.key}`}
                                className="text-sm text-gray-300"
                              >
                                {filter.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scheduling */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`${template.id}_schedule`}
                            checked={template.schedule?.enabled || false}
                            onChange={(e) =>
                              handleTemplateChange(template.id, 'schedule', {
                                ...template.schedule,
                                enabled: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          <label
                            htmlFor={`${template.id}_schedule`}
                            className="text-sm font-semibold text-gray-300"
                          >
                            Enable Scheduled Export
                          </label>
                        </div>

                        {template.schedule?.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Frequency
                              </label>
                              <select
                                value={template.schedule.frequency}
                                onChange={(e) =>
                                  handleTemplateChange(template.id, 'schedule', {
                                    ...template.schedule,
                                    frequency: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Time
                              </label>
                              <input
                                type="time"
                                value={template.schedule.time}
                                onChange={(e) =>
                                  handleTemplateChange(template.id, 'schedule', {
                                    ...template.schedule,
                                    time: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Recipients
                              </label>
                              <textarea
                                placeholder="Email addresses (one per line)"
                                value={template.schedule.recipients.join('\n')}
                                onChange={(e) =>
                                  handleTemplateChange(template.id, 'schedule', {
                                    ...template.schedule,
                                    recipients: e.target.value.split('\n').filter(Boolean),
                                  })
                                }
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <div>Select an export template to configure</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-white">Backup Configuration</h4>
              <button
                onClick={testBackup}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                🧪 Test Backup
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="backup_enabled"
                    checked={backupConfig.enabled}
                    onChange={(e) => handleBackupConfigChange('enabled', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="backup_enabled" className="text-sm font-medium text-gray-300">
                    Enable automatic backups
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Backup Frequency
                  </label>
                  <select
                    value={backupConfig.frequency}
                    onChange={(e) => handleBackupConfigChange('frequency', e.target.value)}
                    disabled={!backupConfig.enabled}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500 disabled:opacity-50"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Destination
                  </label>
                  <select
                    value={backupConfig.destination}
                    onChange={(e) => handleBackupConfigChange('destination', e.target.value)}
                    disabled={!backupConfig.enabled}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500 disabled:opacity-50"
                  >
                    <option value="local">Local Storage</option>
                    <option value="s3">Amazon S3</option>
                    <option value="ftp">FTP Server</option>
                    <option value="cloud">Cloud Storage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Retention Period: {backupConfig.retentionPeriod} days
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={365}
                    value={backupConfig.retentionPeriod}
                    onChange={(e) =>
                      handleBackupConfigChange('retentionPeriod', parseInt(e.target.value))
                    }
                    disabled={!backupConfig.enabled}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Backup Size: {backupConfig.maxBackupSize} MB
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={10240}
                    step={100}
                    value={backupConfig.maxBackupSize}
                    onChange={(e) =>
                      handleBackupConfigChange('maxBackupSize', parseInt(e.target.value))
                    }
                    disabled={!backupConfig.enabled}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-semibold text-gray-300">Backup Options</h5>

                {[
                  { key: 'compression', label: 'Enable compression' },
                  { key: 'encryption', label: 'Enable encryption' },
                  { key: 'includeImages', label: 'Include person images' },
                  { key: 'includeAnalytics', label: 'Include analytics data' },
                ].map((option) => (
                  <div key={option.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`backup_${option.key}`}
                      checked={backupConfig[option.key as keyof BackupConfiguration] as boolean}
                      onChange={(e) => handleBackupConfigChange(option.key, e.target.checked)}
                      disabled={!backupConfig.enabled}
                      className="rounded"
                    />
                    <label htmlFor={`backup_${option.key}`} className="text-sm text-gray-300">
                      {option.label}
                    </label>
                  </div>
                ))}

                <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 mt-6">
                  <h6 className="text-sm font-medium text-blue-400 mb-2">Backup Status</h6>
                  <div className="text-sm text-gray-300 space-y-1">
                    <div>Last backup: 2 hours ago</div>
                    <div>Next backup: In 22 hours</div>
                    <div>Total backups: 15</div>
                    <div>Storage used: 2.3 GB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'retention' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-white">Data Retention Policy</h4>
              <button
                onClick={manualCleanup}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                🧹 Manual Cleanup
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="text-sm font-semibold text-gray-300">Retention Periods</h5>

                {[
                  { key: 'trackingData', label: 'Tracking Data', max: 365 },
                  { key: 'personImages', label: 'Person Images', max: 180 },
                  { key: 'analyticsData', label: 'Analytics Data', max: 730 },
                  { key: 'systemLogs', label: 'System Logs', max: 365 },
                  { key: 'exportedFiles', label: 'Exported Files', max: 180 },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {item.label}: {retentionPolicy[item.key as keyof DataRetentionPolicy]} days
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={item.max}
                      value={retentionPolicy[item.key as keyof DataRetentionPolicy] as number}
                      onChange={(e) =>
                        handleRetentionPolicyChange(item.key, parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">1 day - {item.max} days</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-semibold text-gray-300">Cleanup Options</h5>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_cleanup"
                      checked={retentionPolicy.autoCleanup}
                      onChange={(e) => handleRetentionPolicyChange('autoCleanup', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="auto_cleanup" className="text-sm text-gray-300">
                      Enable automatic cleanup
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Compression After: {retentionPolicy.compressionAfter} days
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={90}
                    value={retentionPolicy.compressionAfter}
                    onChange={(e) =>
                      handleRetentionPolicyChange('compressionAfter', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">Compress old data to save space</div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 mt-6">
                  <h6 className="text-sm font-medium text-yellow-400 mb-2">Storage Usage</h6>
                  <div className="text-sm text-gray-300 space-y-1">
                    <div>Total storage: 15.2 GB</div>
                    <div>Tracking data: 8.4 GB</div>
                    <div>Person images: 4.1 GB</div>
                    <div>Analytics: 2.7 GB</div>
                    <div>Cleanable data: 3.2 GB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <h4 className="text-md font-semibold text-white">Privacy & Compliance</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="text-sm font-semibold text-gray-300">Data Privacy Settings</h5>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="anonymize_exports"
                      defaultChecked={true}
                      className="rounded"
                    />
                    <label htmlFor="anonymize_exports" className="text-sm text-gray-300">
                      Anonymize personal data in exports
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="gdpr_compliance"
                      defaultChecked={true}
                      className="rounded"
                    />
                    <label htmlFor="gdpr_compliance" className="text-sm text-gray-300">
                      GDPR compliance mode
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="audit_trail"
                      defaultChecked={true}
                      className="rounded"
                    />
                    <label htmlFor="audit_trail" className="text-sm text-gray-300">
                      Enable data access audit trail
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="consent_tracking"
                      defaultChecked={false}
                      className="rounded"
                    />
                    <label htmlFor="consent_tracking" className="text-sm text-gray-300">
                      Track data processing consent
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-semibold text-gray-300">Compliance Standards</h5>

                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✅</span>
                      <span className="text-sm text-green-400 font-medium">GDPR Compliant</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Data retention and deletion policies meet GDPR requirements
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✅</span>
                      <span className="text-sm text-green-400 font-medium">CCPA Compliant</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Data export and deletion capabilities support CCPA requirements
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">⚠️</span>
                      <span className="text-sm text-yellow-400 font-medium">HIPAA - Partial</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Additional encryption may be required for healthcare environments
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
                  <h6 className="text-sm font-medium text-blue-400 mb-2">Data Processing Log</h6>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>Last export: 2 hours ago</div>
                    <div>Data deletion: 1 day ago</div>
                    <div>Backup created: 3 hours ago</div>
                    <div>Compliance check: Passed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <button
          onClick={() => {
            setExportTemplates(defaultTemplates);
            setBackupConfig(defaultBackupConfig);
            setRetentionPolicy(defaultRetentionPolicy);
            onSettingsChange();
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
        >
          Reset to Defaults
        </button>

        <div className="text-sm text-gray-400">
          {exportTemplates.length} templates •{' '}
          {backupConfig.enabled ? 'Backups enabled' : 'Backups disabled'}
        </div>
      </div>
    </div>
  );
};

export default ExportSettings;
