// src/components/AlertSettings.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { EnvironmentId, BackendCameraId } from '../types/api';
import { getCameraDisplayName, getEnvironmentConfig } from '../config/environments';

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'person_count' | 'occupancy_time' | 'motion_detected' | 'camera_offline' | 'custom';
  conditions: {
    cameras: BackendCameraId[];
    threshold: number;
    operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
    timeWindow: number; // minutes
    consecutiveOccurrences: number;
  };
  actions: {
    emailNotification: boolean;
    emailAddresses: string[];
    smsNotification: boolean;
    phoneNumbers: string[];
    desktopNotification: boolean;
    soundAlert: boolean;
    webhookUrl?: string;
    customScript?: string;
  };
  schedule: {
    enabled: boolean;
    timezone: string;
    scheduleType: 'always' | 'business_hours' | 'custom';
    customSchedule?: {
      days: string[];
      startTime: string;
      endTime: string;
    };
  };
  cooldownPeriod: number; // minutes
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

interface NotificationChannel {
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams';
  name: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
  testStatus?: { success: boolean; message: string; timestamp: Date };
}

interface AlertSettingsProps {
  environment: EnvironmentId;
  isConnected: boolean;
  onSettingsChange: () => void;
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
}

const AlertSettings: React.FC<AlertSettingsProps> = ({
  environment,
  isConnected: _isConnected,
  onSettingsChange,
  hasUnsavedChanges: _hasUnsavedChanges,
  isSubmitting: _isSubmitting,
}) => {
  const environmentConfig = getEnvironmentConfig(environment);

  // Default alert rules
  const defaultAlertRules: AlertRule[] = useMemo(
    () => [
      {
        id: 'high_occupancy',
        name: 'High Occupancy Alert',
        enabled: true,
        priority: 'medium',
        type: 'person_count',
        conditions: {
          cameras: environmentConfig.cameras.slice(0, 2).map(cam => cam.id),
          threshold: 10,
          operator: 'greater_than',
          timeWindow: 5,
          consecutiveOccurrences: 2,
        },
        actions: {
          emailNotification: true,
          emailAddresses: ['admin@company.com'],
          smsNotification: false,
          phoneNumbers: [],
          desktopNotification: true,
          soundAlert: true,
        },
        schedule: {
          enabled: true,
          timezone: 'America/New_York',
          scheduleType: 'business_hours',
        },
        cooldownPeriod: 15,
        createdAt: new Date(),
        triggerCount: 3,
      },
      {
        id: 'camera_offline',
        name: 'Camera Offline',
        enabled: true,
        priority: 'high',
        type: 'camera_offline',
        conditions: {
          cameras: environmentConfig.cameras.map(cam => cam.id),
          threshold: 1,
          operator: 'greater_than',
          timeWindow: 1,
          consecutiveOccurrences: 1,
        },
        actions: {
          emailNotification: true,
          emailAddresses: ['admin@company.com', 'tech@company.com'],
          smsNotification: true,
          phoneNumbers: ['+1-555-0123'],
          desktopNotification: true,
          soundAlert: true,
        },
        schedule: {
          enabled: true,
          timezone: 'America/New_York',
          scheduleType: 'always',
        },
        cooldownPeriod: 5,
        createdAt: new Date(),
        lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000),
        triggerCount: 1,
      },
      {
        id: 'extended_dwell',
        name: 'Extended Dwell Time',
        enabled: false,
        priority: 'low',
        type: 'occupancy_time',
        conditions: {
          cameras: [environmentConfig.cameras[0].id],
          threshold: 30,
          operator: 'greater_than',
          timeWindow: 60,
          consecutiveOccurrences: 1,
        },
        actions: {
          emailNotification: false,
          emailAddresses: [],
          smsNotification: false,
          phoneNumbers: [],
          desktopNotification: true,
          soundAlert: false,
        },
        schedule: {
          enabled: true,
          timezone: 'America/New_York',
          scheduleType: 'custom',
          customSchedule: {
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            startTime: '09:00',
            endTime: '17:00',
          },
        },
        cooldownPeriod: 60,
        createdAt: new Date(),
        triggerCount: 0,
      },
    ],
    [environmentConfig.cameras]
  );

  // Default notification channels
  const defaultChannels: NotificationChannel[] = useMemo(
    () => [
      {
        type: 'email',
        name: 'Email Notifications',
        enabled: true,
        configuration: {
          smtpServer: 'smtp.company.com',
          port: 587,
          username: 'alerts@company.com',
          password: '********',
          useTLS: true,
        },
      },
      {
        type: 'sms',
        name: 'SMS Notifications',
        enabled: false,
        configuration: {
          provider: 'twilio',
          accountSid: 'AC***',
          authToken: '********',
          fromNumber: '+1-555-0100',
        },
      },
      {
        type: 'webhook',
        name: 'Custom Webhook',
        enabled: false,
        configuration: {
          url: 'https://api.company.com/alerts',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ********',
            'Content-Type': 'application/json',
          },
        },
      },
      {
        type: 'slack',
        name: 'Slack Integration',
        enabled: false,
        configuration: {
          webhookUrl: 'https://hooks.slack.com/services/***',
          channel: '#alerts',
          botName: 'SpotOn Alerts',
        },
      },
    ],
    []
  );

  const [alertRules, setAlertRules] = useState<AlertRule[]>(defaultAlertRules);
  const [notificationChannels, setNotificationChannels] =
    useState<NotificationChannel[]>(defaultChannels);
  const [activeTab, setActiveTab] = useState<'rules' | 'channels' | 'history' | 'testing'>('rules');
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  // Handle alert rule changes
  const handleRuleChange = useCallback(
    (ruleId: string, key: string, value: unknown) => {
      setAlertRules((prev) =>
        prev.map((rule) =>
          rule.id === ruleId
            ? {
              ...rule,
              [key]:
                typeof (rule as any)[key] === 'object'
                  ? { ...(rule as any)[key], ...(value as any) }
                  : value,
            }
            : rule
        )
      );
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Handle channel changes
  const handleChannelChange = useCallback(
    (channelName: string, key: string, value: unknown) => {
      setNotificationChannels((prev) =>
        prev.map((channel) =>
          channel.name === channelName
            ? {
              ...channel,
              [key]:
                typeof (channel as any)[key] === 'object'
                  ? { ...(channel as any)[key], ...(value as any) }
                  : value,
            }
            : channel
        )
      );
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Test notification channel
  const testChannel = useCallback(
    async (channelName: string) => {
      const channel = notificationChannels.find((ch) => ch.name === channelName);
      if (!channel) return;

      setNotificationChannels((prev) =>
        prev.map((ch) =>
          ch.name === channelName
            ? {
              ...ch,
              testStatus: { success: false, message: 'Testing...', timestamp: new Date() },
            }
            : ch
        )
      );

      try {
        // Simulate test
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const success = Math.random() > 0.3; // 70% success rate

        setNotificationChannels((prev) =>
          prev.map((ch) =>
            ch.name === channelName
              ? {
                ...ch,
                testStatus: {
                  success,
                  message: success
                    ? 'Test notification sent successfully'
                    : 'Test failed - check configuration',
                  timestamp: new Date(),
                },
              }
              : ch
          )
        );
      } catch (error) {
        setNotificationChannels((prev) =>
          prev.map((ch) =>
            ch.name === channelName
              ? {
                ...ch,
                testStatus: {
                  success: false,
                  message: 'Test failed with error',
                  timestamp: new Date(),
                },
              }
              : ch
          )
        );
      }
    },
    [notificationChannels]
  );

  // Create new alert rule
  const createNewRule = useCallback(() => {
    const newRule: AlertRule = {
      id: `rule_${Date.now()}`,
      name: 'New Alert Rule',
      enabled: false,
      priority: 'medium',
      type: 'person_count',
      conditions: {
        cameras: [environmentConfig.cameras[0].id],
        threshold: 5,
        operator: 'greater_than',
        timeWindow: 5,
        consecutiveOccurrences: 1,
      },
      actions: {
        emailNotification: false,
        emailAddresses: [],
        smsNotification: false,
        phoneNumbers: [],
        desktopNotification: true,
        soundAlert: false,
      },
      schedule: {
        enabled: true,
        timezone: 'America/New_York',
        scheduleType: 'always',
      },
      cooldownPeriod: 15,
      createdAt: new Date(),
      triggerCount: 0,
    };

    setAlertRules((prev) => [...prev, newRule]);
    setSelectedRule(newRule.id);
    setIsCreatingRule(false);
    onSettingsChange();
  }, [environmentConfig.cameras, onSettingsChange]);

  // Delete alert rule
  const deleteRule = useCallback(
    (ruleId: string) => {
      setAlertRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      if (selectedRule === ruleId) {
        setSelectedRule(null);
      }
      onSettingsChange();
    },
    [selectedRule, onSettingsChange]
  );

  // Get priority color
  const getPriorityColor = useCallback((priority: AlertRule['priority']) => {
    switch (priority) {
      case 'low':
        return 'text-blue-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-orange-400';
      case 'critical':
        return 'text-red-400';
    }
  }, []);

  // Get alert type display name
  const getAlertTypeDisplay = useCallback((type: AlertRule['type']) => {
    switch (type) {
      case 'person_count':
        return 'Person Count';
      case 'occupancy_time':
        return 'Occupancy Time';
      case 'motion_detected':
        return 'Motion Detection';
      case 'camera_offline':
        return 'Camera Offline';
      case 'custom':
        return 'Custom Rule';
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Alert Settings</h3>
          <p className="text-sm text-gray-400">Configure notifications and alert rules</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreatingRule(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            ➕ New Rule
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1">
        {[
          { key: 'rules', label: 'Alert Rules', icon: '⚠️' },
          { key: 'channels', label: 'Channels', icon: '📢' },
          { key: 'history', label: 'History', icon: '📋' },
          { key: 'testing', label: 'Testing', icon: '🧪' },
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
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rules List */}
            <div className="lg:col-span-1 space-y-3">
              <h4 className="text-md font-semibold text-white">
                Alert Rules ({alertRules.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedRule === rule.id
                      ? 'border-orange-400 bg-orange-500/10'
                      : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                      }`}
                    onClick={() => setSelectedRule(rule.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-green-400' : 'bg-gray-400'
                            }`}
                        />
                        <span className="text-white font-medium text-sm">{rule.name}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getPriorityColor(rule.priority)} bg-current/20`}
                      >
                        {rule.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Type: {getAlertTypeDisplay(rule.type)}</div>
                      <div>Triggered: {rule.triggerCount} times</div>
                      {rule.lastTriggered && <div>Last: {rule.lastTriggered.toLocaleString()}</div>}
                    </div>
                  </div>
                ))}

                {isCreatingRule && (
                  <div className="p-3 border-2 border-dashed border-orange-400 rounded-lg">
                    <div className="text-center">
                      <button
                        onClick={createNewRule}
                        className="text-orange-400 hover:text-orange-300 font-medium"
                      >
                        Create New Rule
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rule Details */}
            <div className="lg:col-span-2">
              {selectedRule ? (
                (() => {
                  const rule = alertRules.find((r) => r.id === selectedRule);
                  if (!rule) return null;

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-white">Rule Configuration</h4>
                        <button
                          onClick={() => deleteRule(rule.id)}
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
                              Rule Name
                            </label>
                            <input
                              type="text"
                              value={rule.name}
                              onChange={(e) => handleRuleChange(rule.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Priority
                            </label>
                            <select
                              value={rule.priority}
                              onChange={(e) =>
                                handleRuleChange(rule.id, 'priority', e.target.value)
                              }
                              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Alert Type
                            </label>
                            <select
                              value={rule.type}
                              onChange={(e) => handleRuleChange(rule.id, 'type', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                            >
                              <option value="person_count">Person Count</option>
                              <option value="occupancy_time">Occupancy Time</option>
                              <option value="motion_detected">Motion Detection</option>
                              <option value="camera_offline">Camera Offline</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Cooldown Period: {rule.cooldownPeriod} minutes
                            </label>
                            <input
                              type="range"
                              min={1}
                              max={120}
                              value={rule.cooldownPeriod}
                              onChange={(e) =>
                                handleRuleChange(
                                  rule.id,
                                  'cooldownPeriod',
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`rule_${rule.id}_enabled`}
                            checked={rule.enabled}
                            onChange={(e) => handleRuleChange(rule.id, 'enabled', e.target.checked)}
                            className="rounded"
                          />
                          <label
                            htmlFor={`rule_${rule.id}_enabled`}
                            className="text-sm text-gray-300"
                          >
                            Enable this alert rule
                          </label>
                        </div>
                      </div>

                      {/* Conditions */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-gray-300">Trigger Conditions</h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Cameras
                            </label>
                            <select
                              multiple
                              value={rule.conditions.cameras}
                              onChange={(e) => {
                                const cameras = Array.from(
                                  e.target.selectedOptions,
                                  (option) => option.value as BackendCameraId
                                );
                                handleRuleChange(rule.id, 'conditions', {
                                  ...rule.conditions,
                                  cameras,
                                });
                              }}
                              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500 h-20"
                            >
                              {environmentConfig.cameras.map((camera) => (
                                <option key={camera.id} value={camera.id}>
                                  {getCameraDisplayName(camera.id, environment)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Threshold
                            </label>
                            <div className="flex space-x-2">
                              <select
                                value={rule.conditions.operator}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'conditions', {
                                    ...rule.conditions,
                                    operator: e.target.value,
                                  })
                                }
                                className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                              >
                                <option value="greater_than">&gt;</option>
                                <option value="less_than">&lt;</option>
                                <option value="equals">=</option>
                                <option value="not_equals">≠</option>
                              </select>
                              <input
                                type="number"
                                value={rule.conditions.threshold}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'conditions', {
                                    ...rule.conditions,
                                    threshold: parseInt(e.target.value),
                                  })
                                }
                                className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Time Window: {rule.conditions.timeWindow} minutes
                            </label>
                            <input
                              type="range"
                              min={1}
                              max={60}
                              value={rule.conditions.timeWindow}
                              onChange={(e) =>
                                handleRuleChange(rule.id, 'conditions', {
                                  ...rule.conditions,
                                  timeWindow: parseInt(e.target.value),
                                })
                              }
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Consecutive Occurrences: {rule.conditions.consecutiveOccurrences}
                            </label>
                            <input
                              type="range"
                              min={1}
                              max={10}
                              value={rule.conditions.consecutiveOccurrences}
                              onChange={(e) =>
                                handleRuleChange(rule.id, 'conditions', {
                                  ...rule.conditions,
                                  consecutiveOccurrences: parseInt(e.target.value),
                                })
                              }
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-gray-300">Alert Actions</h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`rule_${rule.id}_email`}
                                checked={rule.actions.emailNotification}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'actions', {
                                    ...rule.actions,
                                    emailNotification: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              <label
                                htmlFor={`rule_${rule.id}_email`}
                                className="text-sm text-gray-300"
                              >
                                Email notification
                              </label>
                            </div>

                            {rule.actions.emailNotification && (
                              <textarea
                                placeholder="Email addresses (one per line)"
                                value={rule.actions.emailAddresses.join('\n')}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'actions', {
                                    ...rule.actions,
                                    emailAddresses: e.target.value.split('\n').filter(Boolean),
                                  })
                                }
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500 text-sm"
                              />
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`rule_${rule.id}_sms`}
                                checked={rule.actions.smsNotification}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'actions', {
                                    ...rule.actions,
                                    smsNotification: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              <label
                                htmlFor={`rule_${rule.id}_sms`}
                                className="text-sm text-gray-300"
                              >
                                SMS notification
                              </label>
                            </div>

                            {rule.actions.smsNotification && (
                              <textarea
                                placeholder="Phone numbers (one per line)"
                                value={rule.actions.phoneNumbers.join('\n')}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'actions', {
                                    ...rule.actions,
                                    phoneNumbers: e.target.value.split('\n').filter(Boolean),
                                  })
                                }
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500 text-sm"
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`rule_${rule.id}_desktop`}
                                checked={rule.actions.desktopNotification}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'actions', {
                                    ...rule.actions,
                                    desktopNotification: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              <label
                                htmlFor={`rule_${rule.id}_desktop`}
                                className="text-sm text-gray-300"
                              >
                                Desktop notification
                              </label>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`rule_${rule.id}_sound`}
                                checked={rule.actions.soundAlert}
                                onChange={(e) =>
                                  handleRuleChange(rule.id, 'actions', {
                                    ...rule.actions,
                                    soundAlert: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              <label
                                htmlFor={`rule_${rule.id}_sound`}
                                className="text-sm text-gray-300"
                              >
                                Sound alert
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-4">⚠️</div>
                  <div>Select an alert rule to configure</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Notification Channels</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {notificationChannels.map((channel) => (
                <div key={channel.name} className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${channel.enabled ? 'bg-green-400' : 'bg-gray-400'
                          }`}
                      />
                      <span className="text-white font-medium">{channel.name}</span>
                      <span className="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded">
                        {channel.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => testChannel(channel.name)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                    >
                      Test
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`channel_${channel.name}`}
                        checked={channel.enabled}
                        onChange={(e) =>
                          handleChannelChange(channel.name, 'enabled', e.target.checked)
                        }
                        className="rounded"
                      />
                      <label htmlFor={`channel_${channel.name}`} className="text-sm text-gray-300">
                        Enable channel
                      </label>
                    </div>

                    {/* Channel-specific configuration */}
                    {channel.type === 'email' && (
                      <div className="text-sm text-gray-400">
                        <div>
                          SMTP: {(channel.configuration as any).smtpServer}:
                          {(channel.configuration as any).port}
                        </div>
                        <div>From: {(channel.configuration as any).username}</div>
                      </div>
                    )}

                    {channel.type === 'sms' && (
                      <div className="text-sm text-gray-400">
                        <div>Provider: {(channel.configuration as any).provider}</div>
                        <div>From: {(channel.configuration as any).fromNumber}</div>
                      </div>
                    )}

                    {channel.type === 'webhook' && (
                      <div className="text-sm text-gray-400">
                        <div>URL: {(channel.configuration as any).url}</div>
                        <div>Method: {(channel.configuration as any).method}</div>
                      </div>
                    )}

                    {/* Test results */}
                    {channel.testStatus && (
                      <div
                        className={`text-xs p-2 rounded ${channel.testStatus.success
                          ? 'bg-green-500/20 text-green-200'
                          : 'bg-red-500/20 text-red-200'
                          }`}
                      >
                        {channel.testStatus.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Alert History</h4>

            <div className="space-y-3">
              {alertRules
                .filter((rule) => rule.lastTriggered)
                .map((rule) => (
                  <div key={rule.id} className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{rule.name}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getPriorityColor(rule.priority)} bg-current/20`}
                      >
                        {rule.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>Last triggered: {rule.lastTriggered?.toLocaleString()}</div>
                      <div>Total triggers: {rule.triggerCount}</div>
                      <div>Type: {getAlertTypeDisplay(rule.type)}</div>
                    </div>
                  </div>
                ))}

              {alertRules.filter((rule) => rule.lastTriggered).length === 0 && (
                <div className="text-center text-gray-400 py-8">No alert history available</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'testing' && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Alert Testing</h4>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-gray-300 mb-3">Test Alert Delivery</h5>
              <p className="text-sm text-gray-400 mb-4">
                Send test notifications to verify your alert configuration is working correctly.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => console.log('Testing email notifications')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  📧 Test Email Notifications
                </button>

                <button
                  onClick={() => console.log('Testing SMS notifications')}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                >
                  📱 Test SMS Notifications
                </button>

                <button
                  onClick={() => console.log('Testing desktop notifications')}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  🖥️ Test Desktop Notifications
                </button>

                <button
                  onClick={() => console.log('Testing all channels')}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
                >
                  🔔 Test All Channels
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <button
          onClick={() => {
            setAlertRules(defaultAlertRules);
            setNotificationChannels(defaultChannels);
            onSettingsChange();
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
        >
          Reset to Defaults
        </button>

        <div className="text-sm text-gray-400">
          {alertRules.filter((rule) => rule.enabled).length} of {alertRules.length} rules active
        </div>
      </div>
    </div>
  );
};

export default AlertSettings;
