import { errorHandler, ErrorReport, ErrorType, ErrorSeverity } from './errorHandler';
import { websocketClient } from './websocket';
import { frameHandler } from './frameHandler';
import { frameSynchronizer } from './frameSynchronizer';
import { performanceMonitor } from './performanceMonitor';
import { healthCheck } from './healthCheck';

export interface RecoveryPlan {
  id: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  steps: RecoveryStep[];
  estimatedTime: number;
  successRate: number;
  prerequisites: string[];
  rollbackPlan: RollbackStep[];
}

export interface RecoveryStep {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  timeout: number;
  retryCount: number;
  validation: () => Promise<boolean>;
  rollback?: () => Promise<void>;
}

export interface RollbackStep {
  id: string;
  name: string;
  execute: () => Promise<void>;
  timeout: number;
}

export interface RecoverySession {
  id: string;
  planId: string;
  startTime: number;
  endTime?: number;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  completedSteps: string[];
  failedSteps: string[];
  errors: string[];
  metrics: RecoveryMetrics;
}

export interface RecoveryMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  executionTime: number;
  validationTime: number;
  rollbackTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    network: number;
  };
}

export interface RecoveryCoordinatorConfig {
  maxConcurrentRecoveries: number;
  defaultTimeout: number;
  enablePreemptiveRecovery: boolean;
  adaptiveRecovery: boolean;
  enableMetrics: boolean;
  recoveryHistory: number;
}

export type RecoveryProgressHandler = (session: RecoverySession) => void;
export type RecoveryCompleteHandler = (session: RecoverySession, success: boolean) => void;

class RecoveryCoordinatorService {
  private config: RecoveryCoordinatorConfig;
  private recoveryPlans: Map<string, RecoveryPlan> = new Map();
  private activeSessions: Map<string, RecoverySession> = new Map();
  private sessionHistory: RecoverySession[] = [];
  private progressHandlers: RecoveryProgressHandler[] = [];
  private completeHandlers: RecoveryCompleteHandler[] = [];
  private resourceMonitor: ResourceMonitor;

  constructor(config: Partial<RecoveryCoordinatorConfig> = {}) {
    this.config = {
      maxConcurrentRecoveries: 3,
      defaultTimeout: 30000,
      enablePreemptiveRecovery: true,
      adaptiveRecovery: true,
      enableMetrics: true,
      recoveryHistory: 100,
      ...config,
    };

    this.resourceMonitor = new ResourceMonitor();
    this.initializeRecoveryPlans();
    this.setupErrorHandling();
  }

  // Initialize recovery plans
  private initializeRecoveryPlans(): void {
    // Connection recovery plan
    this.recoveryPlans.set('connection_recovery', {
      id: 'connection_recovery',
      errorType: 'connection_error',
      severity: 'high',
      estimatedTime: 15000,
      successRate: 0.85,
      prerequisites: [],
      steps: [
        {
          id: 'disconnect_websocket',
          name: 'Disconnect WebSocket',
          description: 'Safely disconnect current WebSocket connection',
          execute: async () => {
            websocketClient.disconnect();
            return true;
          },
          timeout: 5000,
          retryCount: 1,
          validation: async () => !websocketClient.isConnected(),
        },
        {
          id: 'clear_connection_cache',
          name: 'Clear Connection Cache',
          description: 'Clear any cached connection state',
          execute: async () => {
            // Clear any cached connection state
            sessionStorage.removeItem('websocket_state');
            return true;
          },
          timeout: 1000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'health_check_backend',
          name: 'Check Backend Health',
          description: 'Verify backend services are available',
          execute: async () => {
            const health = await healthCheck.checkNow();
            return health.overall !== 'unhealthy';
          },
          timeout: 10000,
          retryCount: 2,
          validation: async () => {
            const health = healthCheck.getCurrentHealth();
            return health?.overall === 'healthy';
          },
        },
        {
          id: 'reconnect_websocket',
          name: 'Reconnect WebSocket',
          description: 'Establish new WebSocket connection',
          execute: async () => {
            await websocketClient.connect();
            return true;
          },
          timeout: 10000,
          retryCount: 3,
          validation: async () => websocketClient.isConnected(),
        },
        {
          id: 'verify_message_flow',
          name: 'Verify Message Flow',
          description: 'Verify WebSocket message reception',
          execute: async () => {
            return new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => resolve(false), 5000);
              const handler = () => {
                clearTimeout(timeout);
                websocketClient.offMessage('heartbeat', handler);
                resolve(true);
              };
              websocketClient.onMessage('heartbeat', handler);
            });
          },
          timeout: 6000,
          retryCount: 2,
          validation: async () => websocketClient.isConnected(),
        },
      ],
      rollbackPlan: [
        {
          id: 'disconnect_on_failure',
          name: 'Disconnect on Failure',
          execute: async () => {
            websocketClient.disconnect();
          },
          timeout: 2000,
        },
      ],
    });

    // Frame processing recovery plan
    this.recoveryPlans.set('frame_processing_recovery', {
      id: 'frame_processing_recovery',
      errorType: 'frame_processing_error',
      severity: 'medium',
      estimatedTime: 10000,
      successRate: 0.92,
      prerequisites: [],
      steps: [
        {
          id: 'pause_frame_processing',
          name: 'Pause Frame Processing',
          description: 'Temporarily pause frame processing',
          execute: async () => {
            // Pause frame processing logic would go here
            return true;
          },
          timeout: 2000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'cleanup_frame_buffers',
          name: 'Cleanup Frame Buffers',
          description: 'Clear frame buffers and cleanup resources',
          execute: async () => {
            frameHandler.cleanup();
            return true;
          },
          timeout: 3000,
          retryCount: 2,
          validation: async () => {
            const stats = frameHandler.getStatistics();
            return stats.bufferSize === 0;
          },
        },
        {
          id: 'reset_synchronizer',
          name: 'Reset Synchronizer',
          description: 'Reset frame synchronizer state',
          execute: async () => {
            frameSynchronizer.reset();
            return true;
          },
          timeout: 2000,
          retryCount: 1,
          validation: async () => {
            const stats = frameSynchronizer.getStatistics();
            return stats.totalFrames === 0;
          },
        },
        {
          id: 'restart_synchronizer',
          name: 'Restart Synchronizer',
          description: 'Restart frame synchronizer',
          execute: async () => {
            frameSynchronizer.start();
            return true;
          },
          timeout: 2000,
          retryCount: 2,
          validation: async () => {
            const quality = frameSynchronizer.getSyncQuality();
            return quality.overall !== 'critical';
          },
        },
        {
          id: 'resume_frame_processing',
          name: 'Resume Frame Processing',
          description: 'Resume normal frame processing',
          execute: async () => {
            // Resume frame processing logic would go here
            return true;
          },
          timeout: 1000,
          retryCount: 1,
          validation: async () => true,
        },
      ],
      rollbackPlan: [
        {
          id: 'stop_synchronizer',
          name: 'Stop Synchronizer',
          execute: async () => {
            frameSynchronizer.stop();
          },
          timeout: 2000,
        },
      ],
    });

    // Performance recovery plan
    this.recoveryPlans.set('performance_recovery', {
      id: 'performance_recovery',
      errorType: 'performance_error',
      severity: 'high',
      estimatedTime: 20000,
      successRate: 0.78,
      prerequisites: [],
      steps: [
        {
          id: 'analyze_performance_metrics',
          name: 'Analyze Performance Metrics',
          description: 'Analyze current performance metrics',
          execute: async () => {
            const metrics = performanceMonitor.getCurrentMetrics();
            const summary = performanceMonitor.getPerformanceSummary();
            
            // Log performance analysis
            console.log('Performance Recovery Analysis:', {
              metrics,
              summary,
              timestamp: new Date().toISOString(),
            });
            
            return true;
          },
          timeout: 2000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'force_garbage_collection',
          name: 'Force Garbage Collection',
          description: 'Force garbage collection to free memory',
          execute: async () => {
            if (window.gc) {
              window.gc();
            }
            return true;
          },
          timeout: 1000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'reduce_frame_buffer_size',
          name: 'Reduce Frame Buffer Size',
          description: 'Reduce frame buffer size to save memory',
          execute: async () => {
            // Reduce buffer sizes
            frameSynchronizer.updateConfig({
              maxBufferSize: 15, // Reduce from default
            });
            return true;
          },
          timeout: 1000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'optimize_sync_window',
          name: 'Optimize Sync Window',
          description: 'Optimize synchronization window for performance',
          execute: async () => {
            frameSynchronizer.updateConfig({
              syncWindow: 50, // Reduce sync window
              enableFrameSkipping: true,
            });
            return true;
          },
          timeout: 1000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'reset_performance_monitor',
          name: 'Reset Performance Monitor',
          description: 'Reset performance monitor state',
          execute: async () => {
            performanceMonitor.reset();
            return true;
          },
          timeout: 2000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'validate_performance_improvement',
          name: 'Validate Performance Improvement',
          description: 'Validate that performance has improved',
          execute: async () => {
            return new Promise<boolean>((resolve) => {
              setTimeout(() => {
                const metrics = performanceMonitor.getCurrentMetrics();
                const isImproved = metrics.fps > 20 && metrics.memoryUsage < 200;
                resolve(isImproved);
              }, 5000);
            });
          },
          timeout: 8000,
          retryCount: 1,
          validation: async () => {
            const summary = performanceMonitor.getPerformanceSummary();
            return summary.overall !== 'critical';
          },
        },
      ],
      rollbackPlan: [
        {
          id: 'restore_default_config',
          name: 'Restore Default Config',
          execute: async () => {
            frameSynchronizer.updateConfig({
              maxBufferSize: 30,
              syncWindow: 100,
            });
          },
          timeout: 2000,
        },
      ],
    });

    // System recovery plan
    this.recoveryPlans.set('system_recovery', {
      id: 'system_recovery',
      errorType: 'critical_system_error',
      severity: 'critical',
      estimatedTime: 45000,
      successRate: 0.65,
      prerequisites: [],
      steps: [
        {
          id: 'stop_all_services',
          name: 'Stop All Services',
          description: 'Stop all real-time services',
          execute: async () => {
            performanceMonitor.stop();
            frameSynchronizer.stop();
            healthCheck.stop();
            websocketClient.disconnect();
            return true;
          },
          timeout: 10000,
          retryCount: 2,
          validation: async () => !websocketClient.isConnected(),
        },
        {
          id: 'comprehensive_cleanup',
          name: 'Comprehensive Cleanup',
          description: 'Perform comprehensive system cleanup',
          execute: async () => {
            frameHandler.cleanup();
            performanceMonitor.reset();
            frameSynchronizer.reset();
            healthCheck.reset();
            
            // Clear any cached data
            sessionStorage.clear();
            
            return true;
          },
          timeout: 5000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'wait_for_stabilization',
          name: 'Wait for Stabilization',
          description: 'Wait for system to stabilize',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return true;
          },
          timeout: 5000,
          retryCount: 1,
          validation: async () => true,
        },
        {
          id: 'restart_core_services',
          name: 'Restart Core Services',
          description: 'Restart core services in order',
          execute: async () => {
            healthCheck.start();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const health = await healthCheck.checkNow();
            if (health.overall === 'unhealthy') {
              throw new Error('Backend services unhealthy');
            }
            
            await websocketClient.connect();
            performanceMonitor.start();
            frameSynchronizer.start();
            
            return true;
          },
          timeout: 20000,
          retryCount: 2,
          validation: async () => {
            return websocketClient.isConnected() && 
                   healthCheck.isHealthy();
          },
        },
        {
          id: 'validate_system_recovery',
          name: 'Validate System Recovery',
          description: 'Validate complete system recovery',
          execute: async () => {
            return new Promise<boolean>((resolve) => {
              setTimeout(() => {
                const wsConnected = websocketClient.isConnected();
                const healthGood = healthCheck.isHealthy();
                const syncGood = frameSynchronizer.getSyncQuality().overall !== 'critical';
                const perfGood = performanceMonitor.getPerformanceSummary().overall !== 'critical';
                
                resolve(wsConnected && healthGood && syncGood && perfGood);
              }, 8000);
            });
          },
          timeout: 10000,
          retryCount: 1,
          validation: async () => true,
        },
      ],
      rollbackPlan: [
        {
          id: 'emergency_shutdown',
          name: 'Emergency Shutdown',
          execute: async () => {
            performanceMonitor.stop();
            frameSynchronizer.stop();
            healthCheck.stop();
            websocketClient.disconnect();
            frameHandler.cleanup();
          },
          timeout: 5000,
        },
      ],
    });
  }

  // Setup error handling
  private setupErrorHandling(): void {
    errorHandler.onError((error) => {
      if (this.config.enablePreemptiveRecovery) {
        this.handlePreemptiveRecovery(error);
      }
    });
  }

  // Handle preemptive recovery
  private handlePreemptiveRecovery(error: ErrorReport): void {
    // Don't start recovery if already recovered
    if (error.recovered) {
      return;
    }

    // Check if we're at max concurrent recoveries
    if (this.activeSessions.size >= this.config.maxConcurrentRecoveries) {
      return;
    }

    // Select appropriate recovery plan
    const plan = this.selectRecoveryPlan(error);
    if (!plan) {
      return;
    }

    // Start recovery session
    this.startRecoverySession(plan).catch(error => {
      console.error('Preemptive recovery failed:', error);
    });
  }

  // Select recovery plan
  private selectRecoveryPlan(error: ErrorReport): RecoveryPlan | null {
    // First try to find exact match
    const exactMatch = Array.from(this.recoveryPlans.values())
      .find(plan => plan.errorType === error.type && plan.severity === error.severity);
    
    if (exactMatch) {
      return exactMatch;
    }

    // Try to find by error type
    const typeMatch = Array.from(this.recoveryPlans.values())
      .find(plan => plan.errorType === error.type);
    
    if (typeMatch) {
      return typeMatch;
    }

    // Fallback to system recovery for critical errors
    if (error.severity === 'critical') {
      return this.recoveryPlans.get('system_recovery') || null;
    }

    return null;
  }

  // Start recovery session
  async startRecoverySession(plan: RecoveryPlan): Promise<RecoverySession> {
    const sessionId = this.generateSessionId();
    const session: RecoverySession = {
      id: sessionId,
      planId: plan.id,
      startTime: Date.now(),
      status: 'in_progress',
      currentStep: 0,
      completedSteps: [],
      failedSteps: [],
      errors: [],
      metrics: {
        totalSteps: plan.steps.length,
        completedSteps: 0,
        failedSteps: 0,
        executionTime: 0,
        validationTime: 0,
        rollbackTime: 0,
        resourceUsage: {
          memory: 0,
          cpu: 0,
          network: 0,
        },
      },
    };

    this.activeSessions.set(sessionId, session);
    
    try {
      await this.executeRecoveryPlan(session, plan);
      session.status = 'completed';
      session.endTime = Date.now();
    } catch (error) {
      session.status = 'failed';
      session.endTime = Date.now();
      session.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      // Execute rollback plan
      await this.executeRollbackPlan(session, plan);
    }

    this.activeSessions.delete(sessionId);
    this.addToHistory(session);
    this.notifyCompleteHandlers(session, session.status === 'completed');

    return session;
  }

  // Execute recovery plan
  private async executeRecoveryPlan(session: RecoverySession, plan: RecoveryPlan): Promise<void> {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      session.currentStep = i;
      
      this.notifyProgressHandlers(session);
      
      const stepStartTime = Date.now();
      
      try {
        // Execute step with timeout
        const success = await this.executeStepWithTimeout(step);
        
        if (success) {
          // Validate step
          const validationStartTime = Date.now();
          const isValid = await this.validateStepWithTimeout(step);
          session.metrics.validationTime += Date.now() - validationStartTime;
          
          if (isValid) {
            session.completedSteps.push(step.id);
            session.metrics.completedSteps++;
          } else {
            throw new Error(`Step validation failed: ${step.name}`);
          }
        } else {
          throw new Error(`Step execution failed: ${step.name}`);
        }
      } catch (error) {
        session.failedSteps.push(step.id);
        session.metrics.failedSteps++;
        session.errors.push(error instanceof Error ? error.message : 'Unknown error');
        
        // Execute rollback if available
        if (step.rollback) {
          try {
            await step.rollback();
          } catch (rollbackError) {
            console.error('Step rollback failed:', rollbackError);
          }
        }
        
        throw error;
      }
      
      session.metrics.executionTime += Date.now() - stepStartTime;
      
      // Update resource usage
      if (this.config.enableMetrics) {
        this.updateResourceMetrics(session);
      }
    }
  }

  // Execute step with timeout
  private async executeStepWithTimeout(step: RecoveryStep): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Step timeout: ${step.name}`));
      }, step.timeout);

      step.execute()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Validate step with timeout
  private async validateStepWithTimeout(step: RecoveryStep): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Validation timeout: ${step.name}`));
      }, step.timeout / 2);

      step.validation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Execute rollback plan
  private async executeRollbackPlan(session: RecoverySession, plan: RecoveryPlan): Promise<void> {
    const rollbackStartTime = Date.now();
    
    for (const rollbackStep of plan.rollbackPlan) {
      try {
        await this.executeRollbackStepWithTimeout(rollbackStep);
      } catch (error) {
        console.error('Rollback step failed:', error);
        session.errors.push(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    session.metrics.rollbackTime = Date.now() - rollbackStartTime;
  }

  // Execute rollback step with timeout
  private async executeRollbackStepWithTimeout(step: RollbackStep): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Rollback timeout: ${step.name}`));
      }, step.timeout);

      step.execute()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Update resource metrics
  private updateResourceMetrics(session: RecoverySession): void {
    const resources = this.resourceMonitor.getCurrentUsage();
    session.metrics.resourceUsage = {
      memory: Math.max(session.metrics.resourceUsage.memory, resources.memory),
      cpu: Math.max(session.metrics.resourceUsage.cpu, resources.cpu),
      network: Math.max(session.metrics.resourceUsage.network, resources.network),
    };
  }

  // Generate session ID
  private generateSessionId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add to history
  private addToHistory(session: RecoverySession): void {
    this.sessionHistory.push(session);
    
    // Keep only recent history
    if (this.sessionHistory.length > this.config.recoveryHistory) {
      this.sessionHistory.shift();
    }
  }

  // Notify handlers
  private notifyProgressHandlers(session: RecoverySession): void {
    this.progressHandlers.forEach(handler => {
      try {
        handler(session);
      } catch (error) {
        console.error('Progress handler error:', error);
      }
    });
  }

  private notifyCompleteHandlers(session: RecoverySession, success: boolean): void {
    this.completeHandlers.forEach(handler => {
      try {
        handler(session, success);
      } catch (error) {
        console.error('Complete handler error:', error);
      }
    });
  }

  // Public API
  onProgress(handler: RecoveryProgressHandler): void {
    this.progressHandlers.push(handler);
  }

  offProgress(handler: RecoveryProgressHandler): void {
    const index = this.progressHandlers.indexOf(handler);
    if (index > -1) {
      this.progressHandlers.splice(index, 1);
    }
  }

  onComplete(handler: RecoveryCompleteHandler): void {
    this.completeHandlers.push(handler);
  }

  offComplete(handler: RecoveryCompleteHandler): void {
    const index = this.completeHandlers.indexOf(handler);
    if (index > -1) {
      this.completeHandlers.splice(index, 1);
    }
  }

  // Get active sessions
  getActiveSessions(): RecoverySession[] {
    return Array.from(this.activeSessions.values());
  }

  // Get session history
  getSessionHistory(): RecoverySession[] {
    return [...this.sessionHistory];
  }

  // Get recovery plans
  getRecoveryPlans(): RecoveryPlan[] {
    return Array.from(this.recoveryPlans.values());
  }

  // Manual recovery trigger
  async triggerRecovery(planId: string): Promise<RecoverySession> {
    const plan = this.recoveryPlans.get(planId);
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planId}`);
    }

    return this.startRecoverySession(plan);
  }

  // Cancel recovery session
  async cancelRecovery(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'cancelled';
    session.endTime = Date.now();
    
    // Execute rollback if available
    const plan = this.recoveryPlans.get(session.planId);
    if (plan) {
      await this.executeRollbackPlan(session, plan);
    }

    this.activeSessions.delete(sessionId);
    this.addToHistory(session);
    this.notifyCompleteHandlers(session, false);

    return true;
  }

  // Get recovery statistics
  getRecoveryStatistics(): {
    totalRecoveries: number;
    successRate: number;
    averageExecutionTime: number;
    planSuccessRates: Record<string, number>;
    recentPerformance: {
      last24h: number;
      last7d: number;
      last30d: number;
    };
  } {
    const total = this.sessionHistory.length;
    const successful = this.sessionHistory.filter(s => s.status === 'completed').length;
    const successRate = total > 0 ? successful / total : 0;
    
    const totalTime = this.sessionHistory.reduce((sum, s) => 
      sum + (s.endTime ? s.endTime - s.startTime : 0), 0);
    const averageTime = total > 0 ? totalTime / total : 0;
    
    const planSuccessRates: Record<string, number> = {};
    this.recoveryPlans.forEach((plan, planId) => {
      const planSessions = this.sessionHistory.filter(s => s.planId === planId);
      const planSuccessful = planSessions.filter(s => s.status === 'completed').length;
      planSuccessRates[planId] = planSessions.length > 0 ? planSuccessful / planSessions.length : 0;
    });
    
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last24h = this.sessionHistory.filter(s => now - s.startTime < day).length;
    const last7d = this.sessionHistory.filter(s => now - s.startTime < 7 * day).length;
    const last30d = this.sessionHistory.filter(s => now - s.startTime < 30 * day).length;

    return {
      totalRecoveries: total,
      successRate,
      averageExecutionTime: averageTime,
      planSuccessRates,
      recentPerformance: {
        last24h,
        last7d,
        last30d,
      },
    };
  }

  // Update configuration
  updateConfig(config: Partial<RecoveryCoordinatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get configuration
  getConfig(): RecoveryCoordinatorConfig {
    return { ...this.config };
  }
}

// Resource monitor utility
class ResourceMonitor {
  getCurrentUsage(): { memory: number; cpu: number; network: number } {
    const memory = this.getMemoryUsage();
    const cpu = this.getCPUUsage();
    const network = this.getNetworkUsage();
    
    return { memory, cpu, network };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  private getCPUUsage(): number {
    // This is a simplified estimation
    const performanceMetrics = performanceMonitor.getCurrentMetrics();
    return performanceMetrics.cpuUsage || 0;
  }

  private getNetworkUsage(): number {
    // This is a simplified estimation
    const wsMetrics = websocketClient.getPerformanceMetrics();
    return wsMetrics.bytesReceived / (1024 * 1024); // Convert to MB
  }
}

// Export service instance
export const recoveryCoordinator = new RecoveryCoordinatorService();

// Export service class for custom instances
export { RecoveryCoordinatorService };