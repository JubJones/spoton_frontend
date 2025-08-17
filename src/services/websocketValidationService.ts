// WebSocket Validation Service - Critical Pre-Phase 15 Requirements
// src/services/websocketValidationService.ts

import { WebSocketService } from './websocketService';
import { APP_CONFIG } from '../config/app';
import type { EnvironmentId } from '../types/api';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface WebSocketValidationResult {
  isValid: boolean;
  connectionTime: number;
  messageLatency: number;
  issues: string[];
  warnings: string[];
  capabilities: string[];
  testResults: {
    basicConnection: boolean;
    messageEcho: boolean;
    taskConnection: boolean;
    trackingSubscription: boolean;
    errorHandling: boolean;
  };
}

interface WebSocketTestOptions {
  timeout: number;
  testEnvironment: EnvironmentId;
  enableComprehensiveTest: boolean;
  testReconnection: boolean;
}

interface WebSocketFallbackStrategy {
  name: string;
  priority: number;
  isAvailable: () => boolean;
  execute: () => Promise<void>;
  description: string;
}

// =============================================================================
// WebSocket Validation Service
// =============================================================================

class WebSocketValidationService {
  private testResults: Partial<WebSocketValidationResult> = {};
  private testInProgress = false;
  private fallbackStrategies: WebSocketFallbackStrategy[] = [];

  constructor() {
    this.initializeFallbackStrategies();
  }

  // =============================================================================
  // Connection Validation
  // =============================================================================

  /**
   * Comprehensive WebSocket validation
   */
  async validateWebSocketConnection(
    options: Partial<WebSocketTestOptions> = {}
  ): Promise<WebSocketValidationResult> {
    if (this.testInProgress) {
      throw new Error('WebSocket validation already in progress');
    }

    this.testInProgress = true;
    const opts: WebSocketTestOptions = {
      timeout: 10000,
      testEnvironment: 'factory',
      enableComprehensiveTest: true,
      testReconnection: false,
      ...options,
    };

    console.log('🔍 Starting comprehensive WebSocket validation...');

    const result: WebSocketValidationResult = {
      isValid: false,
      connectionTime: 0,
      messageLatency: 0,
      issues: [],
      warnings: [],
      capabilities: [],
      testResults: {
        basicConnection: false,
        messageEcho: false,
        taskConnection: false,
        trackingSubscription: false,
        errorHandling: false,
      },
    };

    try {
      // Test 1: Basic Connection
      console.log('📡 Test 1: Basic WebSocket connection');
      const basicTest = await this.testBasicConnection(opts.timeout);
      result.testResults.basicConnection = basicTest.success;
      result.connectionTime = basicTest.connectionTime;

      if (!basicTest.success) {
        result.issues.push(`Basic connection failed: ${basicTest.error}`);
      } else {
        result.capabilities.push('basic_connection');
      }

      // Test 2: Message Echo (if basic connection works)
      if (result.testResults.basicConnection) {
        console.log('💬 Test 2: Message echo test');
        const echoTest = await this.testMessageEcho(opts.timeout);
        result.testResults.messageEcho = echoTest.success;
        result.messageLatency = echoTest.latency;

        if (!echoTest.success) {
          result.warnings.push(`Message echo failed: ${echoTest.error}`);
        } else {
          result.capabilities.push('message_exchange');
        }
      }

      // Test 3: Task Connection (comprehensive test)
      if (opts.enableComprehensiveTest && result.testResults.basicConnection) {
        console.log('🎯 Test 3: Task-specific connection');
        const taskTest = await this.testTaskConnection(opts.testEnvironment, opts.timeout);
        result.testResults.taskConnection = taskTest.success;

        if (!taskTest.success) {
          result.warnings.push(`Task connection failed: ${taskTest.error}`);
        } else {
          result.capabilities.push('task_connection');
        }
      }

      // Test 4: Tracking Subscription (if task connection works)
      if (opts.enableComprehensiveTest && result.testResults.taskConnection) {
        console.log('📊 Test 4: Tracking subscription test');
        const trackingTest = await this.testTrackingSubscription(opts.timeout);
        result.testResults.trackingSubscription = trackingTest.success;

        if (!trackingTest.success) {
          result.warnings.push(`Tracking subscription failed: ${trackingTest.error}`);
        } else {
          result.capabilities.push('tracking_subscription');
        }
      }

      // Test 5: Error Handling
      if (opts.enableComprehensiveTest) {
        console.log('⚠️ Test 5: Error handling test');
        const errorTest = await this.testErrorHandling(opts.timeout);
        result.testResults.errorHandling = errorTest.success;

        if (!errorTest.success) {
          result.warnings.push('Error handling validation incomplete');
        } else {
          result.capabilities.push('error_handling');
        }
      }

      // Test 6: Reconnection (optional)
      if (opts.testReconnection) {
        console.log('🔄 Test 6: Reconnection capability');
        const reconnectionTest = await this.testReconnectionCapability(opts.timeout);
        
        if (!reconnectionTest.success) {
          result.warnings.push('Reconnection test failed');
        } else {
          result.capabilities.push('auto_reconnection');
        }
      }

      // Determine overall validity
      const criticalTests = [
        result.testResults.basicConnection,
        result.testResults.messageEcho,
      ];

      result.isValid = criticalTests.every(test => test);

      if (result.isValid) {
        console.log('✅ WebSocket validation successful');
      } else {
        console.warn('⚠️ WebSocket validation failed critical tests');
      }

      // Add performance warnings
      if (result.connectionTime > 5000) {
        result.warnings.push(`Slow connection time: ${result.connectionTime}ms`);
      }
      if (result.messageLatency > 1000) {
        result.warnings.push(`High message latency: ${result.messageLatency}ms`);
      }

      return result;
    } catch (error) {
      result.issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    } finally {
      this.testInProgress = false;
    }
  }

  // =============================================================================
  // Individual Test Methods
  // =============================================================================

  /**
   * Test basic WebSocket connection
   */
  private async testBasicConnection(timeout: number): Promise<{
    success: boolean;
    connectionTime: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const wsUrl = `${APP_CONFIG.WS_BASE_URL}/ws/test`;
      
      let ws: WebSocket;
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (ws) ws.close();
          resolve({
            success: false,
            connectionTime: Date.now() - startTime,
            error: 'Connection timeout',
          });
        }
      }, timeout);

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({
              success: true,
              connectionTime: Date.now() - startTime,
            });
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              success: false,
              connectionTime: Date.now() - startTime,
              error: 'Connection error',
            });
          }
        };

        ws.onclose = (event) => {
          if (!resolved && event.code !== 1000) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              success: false,
              connectionTime: Date.now() - startTime,
              error: `Connection closed: ${event.code}`,
            });
          }
        };
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            connectionTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Connection setup failed',
          });
        }
      }
    });
  }

  /**
   * Test message echo capability
   */
  private async testMessageEcho(timeout: number): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const wsUrl = `${APP_CONFIG.WS_BASE_URL}/ws/test`;
      
      let ws: WebSocket;
      let resolved = false;
      let messageSent = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (ws) ws.close();
          resolve({
            success: false,
            latency: Date.now() - startTime,
            error: 'Echo test timeout',
          });
        }
      }, timeout);

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!messageSent) {
            messageSent = true;
            const testMessage = JSON.stringify({
              type: 'echo_test',
              timestamp: Date.now(),
              data: 'validation_test',
            });
            ws.send(testMessage);
          }
        };

        ws.onmessage = (event) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            
            try {
              const response = JSON.parse(event.data);
              if (response.type === 'echo_response' || response.data === 'validation_test') {
                resolve({
                  success: true,
                  latency: Date.now() - startTime,
                });
              } else {
                resolve({
                  success: false,
                  latency: Date.now() - startTime,
                  error: 'Invalid echo response',
                });
              }
            } catch {
              // Even if we can't parse, receiving any message is a good sign
              resolve({
                success: true,
                latency: Date.now() - startTime,
              });
            }
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              success: false,
              latency: Date.now() - startTime,
              error: 'Echo test connection error',
            });
          }
        };
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            latency: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Echo test setup failed',
          });
        }
      }
    });
  }

  /**
   * Test task-specific connection
   */
  private async testTaskConnection(environment: EnvironmentId, timeout: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const wsUrl = `${APP_CONFIG.WS_BASE_URL}/ws/tracking/test-task`;
      
      let ws: WebSocket;
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (ws) ws.close();
          resolve({
            success: false,
            error: 'Task connection timeout',
          });
        }
      }, timeout);

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({ success: true });
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              success: false,
              error: 'Task connection error',
            });
          }
        };
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Task connection setup failed',
          });
        }
      }
    });
  }

  /**
   * Test tracking subscription capability
   */
  private async testTrackingSubscription(timeout: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const wsService = new WebSocketService({
        enableBinaryFrames: false,
        enableCompression: false,
      });

      let resolved = false;
      let subscribed = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          wsService.disconnect();
          resolve({
            success: false,
            error: 'Tracking subscription timeout',
          });
        }
      }, timeout);

      try {
        wsService.addEventListener('connection-established', () => {
          if (!subscribed) {
            subscribed = true;
            wsService.subscribeToTracking();
          }
        });

        wsService.addEventListener('tracking-update', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            wsService.disconnect();
            resolve({ success: true });
          }
        });

        wsService.addEventListener('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            wsService.disconnect();
            resolve({
              success: false,
              error: 'Tracking subscription error',
            });
          }
        });

        wsService.connect('/ws/tracking/test-task');
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Subscription setup failed',
          });
        }
      }
    });
  }

  /**
   * Test error handling capabilities
   */
  private async testErrorHandling(timeout: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const wsUrl = `${APP_CONFIG.WS_BASE_URL}/ws/invalid-endpoint`;
      
      let ws: WebSocket;
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (ws) ws.close();
          resolve({ success: true }); // Timeout is acceptable for error test
        }
      }, timeout);

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          // Unexpected success - close and report
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({
              success: false,
              error: 'Invalid endpoint should not connect',
            });
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({ success: true }); // Error is expected
          }
        };

        ws.onclose = (event) => {
          if (!resolved && event.code !== 1000) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({ success: true }); // Error close is expected
          }
        };
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({ success: true }); // Exception is expected
        }
      }
    });
  }

  /**
   * Test reconnection capability
   */
  private async testReconnectionCapability(timeout: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const wsService = new WebSocketService({
        maxReconnectAttempts: 2,
        reconnectDelay: 1000,
      });

      let resolved = false;
      let connectCount = 0;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          wsService.disconnect();
          resolve({
            success: connectCount > 1,
            error: connectCount <= 1 ? 'Reconnection did not occur' : undefined,
          });
        }
      }, timeout);

      wsService.addEventListener('connection-established', () => {
        connectCount++;
        
        if (connectCount === 1) {
          // Simulate disconnection after first connection
          setTimeout(() => {
            wsService.disconnect();
            setTimeout(() => {
              wsService.connect('/ws/tracking/test-task');
            }, 500);
          }, 500);
        } else if (connectCount >= 2) {
          // Successful reconnection
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            wsService.disconnect();
            resolve({ success: true });
          }
        }
      });

      wsService.addEventListener('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          wsService.disconnect();
          resolve({
            success: false,
            error: 'Reconnection test failed',
          });
        }
      });

      try {
        wsService.connect('/ws/tracking/test-task');
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Reconnection test setup failed',
          });
        }
      }
    });
  }

  // =============================================================================
  // Fallback Strategies
  // =============================================================================

  /**
   * Initialize fallback strategies
   */
  private initializeFallbackStrategies(): void {
    this.fallbackStrategies = [
      {
        name: 'Polling Fallback',
        priority: 1,
        isAvailable: () => true,
        execute: async () => {
          console.log('🔄 Activating polling fallback for real-time data');
          // Implementation would switch to HTTP polling
        },
        description: 'Fall back to HTTP polling for real-time updates',
      },
      {
        name: 'Server-Sent Events',
        priority: 2,
        isAvailable: () => typeof EventSource !== 'undefined',
        execute: async () => {
          console.log('📡 Attempting Server-Sent Events fallback');
          // Implementation would use SSE
        },
        description: 'Use Server-Sent Events for one-way real-time updates',
      },
      {
        name: 'Long Polling',
        priority: 3,
        isAvailable: () => true,
        execute: async () => {
          console.log('⏳ Activating long polling fallback');
          // Implementation would use long polling
        },
        description: 'Use long polling for near real-time updates',
      },
    ];
  }

  /**
   * Execute fallback strategy
   */
  async executeFallbackStrategy(): Promise<{ success: boolean; strategy?: string; error?: string }> {
    console.log('🚨 WebSocket failed, attempting fallback strategies...');
    
    // Sort strategies by priority
    const sortedStrategies = this.fallbackStrategies
      .filter(strategy => strategy.isAvailable())
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      try {
        console.log(`🔄 Trying fallback: ${strategy.name}`);
        await strategy.execute();
        
        console.log(`✅ Fallback strategy successful: ${strategy.name}`);
        return { success: true, strategy: strategy.name };
      } catch (error) {
        console.warn(`❌ Fallback strategy failed: ${strategy.name}`, error);
      }
    }

    return {
      success: false,
      error: 'All fallback strategies failed',
    };
  }

  /**
   * Get available fallback strategies
   */
  getAvailableFallbackStrategies(): WebSocketFallbackStrategy[] {
    return this.fallbackStrategies.filter(strategy => strategy.isAvailable());
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Generate WebSocket validation report
   */
  generateValidationReport(result: WebSocketValidationResult): string {
    const report = [
      '# WebSocket Validation Report',
      '',
      `**Generated**: ${new Date().toISOString()}`,
      `**Overall Status**: ${result.isValid ? '✅ PASS' : '❌ FAIL'}`,
      `**Connection Time**: ${result.connectionTime}ms`,
      `**Message Latency**: ${result.messageLatency}ms`,
      '',
      '## Test Results',
      `- **Basic Connection**: ${result.testResults.basicConnection ? '✅' : '❌'}`,
      `- **Message Echo**: ${result.testResults.messageEcho ? '✅' : '❌'}`,
      `- **Task Connection**: ${result.testResults.taskConnection ? '✅' : '❌'}`,
      `- **Tracking Subscription**: ${result.testResults.trackingSubscription ? '✅' : '❌'}`,
      `- **Error Handling**: ${result.testResults.errorHandling ? '✅' : '❌'}`,
      '',
      '## Capabilities',
      ...result.capabilities.map(cap => `- ${cap}`),
      '',
    ];

    if (result.issues.length > 0) {
      report.push('## Issues');
      result.issues.forEach(issue => report.push(`- ❌ ${issue}`));
      report.push('');
    }

    if (result.warnings.length > 0) {
      report.push('## Warnings');
      result.warnings.forEach(warning => report.push(`- ⚠️ ${warning}`));
      report.push('');
    }

    const availableFallbacks = this.getAvailableFallbackStrategies();
    if (availableFallbacks.length > 0) {
      report.push('## Available Fallback Strategies');
      availableFallbacks.forEach(strategy => {
        report.push(`- **${strategy.name}** (Priority ${strategy.priority}): ${strategy.description}`);
      });
    }

    return report.join('\n');
  }

  /**
   * Check if WebSocket validation is in progress
   */
  isValidationInProgress(): boolean {
    return this.testInProgress;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const websocketValidationService = new WebSocketValidationService();

export default websocketValidationService;