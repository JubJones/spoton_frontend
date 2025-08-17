// Performance Validation Service - Phase 15.2 Performance Testing
// src/services/performanceValidationService.ts

import { performanceOptimizationService } from './performanceOptimizationService';
import { APP_CONFIG } from '../config/app';
import type { EnvironmentId } from '../types/api';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface PerformanceMetrics {
  responseTime: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    dataTransferRate: number; // MB/s
  };
  resource: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    networkUtilization: number; // percentage
  };
  rendering: {
    fps: number;
    frameDrops: number;
    renderTime: number; // ms
  };
  webSocket: {
    connectionTime: number;
    messageLatency: number;
    reconnections: number;
    dataRate: number; // messages/second
  };
}

interface LoadTestConfig {
  duration: number; // seconds
  concurrency: number; // simultaneous users
  rampUpTime: number; // seconds
  targetRPS: number; // requests per second
  scenarios: LoadTestScenario[];
}

interface LoadTestScenario {
  name: string;
  weight: number; // 0-1
  actions: ScenarioAction[];
}

interface ScenarioAction {
  type: 'http' | 'websocket' | 'wait' | 'compute';
  endpoint?: string;
  duration?: number;
  data?: any;
}

interface PerformanceTest {
  name: string;
  category: 'load' | 'stress' | 'volume' | 'endurance' | 'spike';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  metrics?: PerformanceMetrics;
  results?: any;
  errors?: string[];
}

interface MemoryLeakTest {
  testName: string;
  initialMemory: number;
  finalMemory: number;
  peakMemory: number;
  samples: number[];
  leakDetected: boolean;
  leakRate?: number; // MB/minute
}

interface BandwidthOptimizationTest {
  testName: string;
  uncompressed: {
    size: number;
    transferTime: number;
  };
  compressed: {
    size: number;
    transferTime: number;
  };
  optimization: {
    sizeReduction: number; // percentage
    speedImprovement: number; // percentage
  };
}

// =============================================================================
// Performance Validation Service
// =============================================================================

class PerformanceValidationService {
  private activeTests: Map<string, PerformanceTest> = new Map();
  private testHistory: PerformanceTest[] = [];
  private performanceBaseline: PerformanceMetrics;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.performanceBaseline = this.getPerformanceBaseline();
  }

  // =============================================================================
  // Load Testing (15.2.1)
  // =============================================================================

  /**
   * Run load testing with multiple simultaneous users
   */
  async runLoadTesting(config: Partial<LoadTestConfig> = {}): Promise<PerformanceTest> {
    const testConfig: LoadTestConfig = {
      duration: 60, // 1 minute
      concurrency: 10,
      rampUpTime: 10,
      targetRPS: 50,
      scenarios: [
        {
          name: 'Health Check',
          weight: 0.3,
          actions: [{ type: 'http', endpoint: '/health' }],
        },
        {
          name: 'Processing Task',
          weight: 0.4,
          actions: [
            { type: 'http', endpoint: '/processing/start', data: { environment_id: 'factory' } },
            { type: 'wait', duration: 1000 },
          ],
        },
        {
          name: 'WebSocket Connection',
          weight: 0.3,
          actions: [{ type: 'websocket', endpoint: '/ws/tracking/test' }],
        },
      ],
      ...config,
    };

    const test: PerformanceTest = {
      name: 'Load Testing',
      category: 'load',
      status: 'pending',
    };

    this.activeTests.set('load-test', test);

    try {
      console.log(`🚀 Starting load test: ${testConfig.concurrency} users for ${testConfig.duration}s`);
      test.status = 'running';
      test.startTime = Date.now();

      // Create performance monitoring
      const metrics = this.initializeMetrics();
      const workers: Promise<any>[] = [];

      // Ramp up users gradually
      for (let i = 0; i < testConfig.concurrency; i++) {
        const delay = (testConfig.rampUpTime * 1000 * i) / testConfig.concurrency;
        
        workers.push(
          new Promise(resolve => {
            setTimeout(async () => {
              const workerMetrics = await this.runLoadTestWorker(
                testConfig.scenarios,
                testConfig.duration * 1000 - delay,
                i
              );
              resolve(workerMetrics);
            }, delay);
          })
        );
      }

      // Wait for all workers to complete
      const workerResults = await Promise.all(workers);
      
      // Aggregate metrics
      test.metrics = this.aggregateWorkerMetrics(workerResults);
      test.status = 'completed';
      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;

      console.log(`✅ Load test completed: ${test.metrics.throughput.requestsPerSecond.toFixed(1)} RPS`);
      
    } catch (error) {
      test.status = 'failed';
      test.errors = [error instanceof Error ? error.message : 'Load test failed'];
      console.error('❌ Load test failed:', error);
    }

    this.testHistory.push(test);
    this.activeTests.delete('load-test');
    return test;
  }

  /**
   * Individual load test worker
   */
  private async runLoadTestWorker(
    scenarios: LoadTestScenario[],
    duration: number,
    workerId: number
  ): Promise<any> {
    const startTime = Date.now();
    const metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [] as number[],
      dataTransferred: 0,
    };

    while ((Date.now() - startTime) < duration) {
      try {
        // Select scenario based on weight
        const scenario = this.selectScenario(scenarios);
        
        for (const action of scenario.actions) {
          const actionStart = Date.now();
          
          switch (action.type) {
            case 'http':
              await this.executeHttpAction(action, metrics);
              break;
            case 'websocket':
              await this.executeWebSocketAction(action, metrics);
              break;
            case 'wait':
              await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
              break;
            case 'compute':
              this.executeComputeAction(action.duration || 100);
              break;
          }

          metrics.responseTimes.push(Date.now() - actionStart);
          metrics.requests++;
        }

        // Small delay between scenario iterations
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        metrics.errors++;
        console.warn(`Worker ${workerId} error:`, error);
      }
    }

    return metrics;
  }

  /**
   * Execute HTTP action for load testing
   */
  private async executeHttpAction(action: ScenarioAction, metrics: any): Promise<void> {
    const url = `${APP_CONFIG.API_BASE_URL}${action.endpoint}`;
    const method = action.data ? 'POST' : 'GET';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(action.data && { body: JSON.stringify(action.data) }),
    });

    // Estimate data transferred (rough calculation)
    const responseText = await response.text();
    metrics.dataTransferred += responseText.length;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  /**
   * Execute WebSocket action for load testing
   */
  private async executeWebSocketAction(action: ScenarioAction, metrics: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${APP_CONFIG.WS_BASE_URL}${action.endpoint}`;
      const ws = new WebSocket(wsUrl);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          reject(new Error('WebSocket timeout'));
        }
      }, 5000);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          metrics.dataTransferred += 100; // Estimate connection overhead
          resolve();
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        }
      };
    });
  }

  /**
   * Execute compute action (CPU intensive task)
   */
  private executeComputeAction(duration: number): void {
    const startTime = Date.now();
    while ((Date.now() - startTime) < duration) {
      // Simulate CPU-intensive work
      Math.sqrt(Math.random() * 1000000);
    }
  }

  // =============================================================================
  // Memory Leak Detection (15.2.3)
  // =============================================================================

  /**
   * Run memory leak detection test
   */
  async runMemoryLeakDetection(duration: number = 300000): Promise<MemoryLeakTest> {
    console.log(`🧠 Starting memory leak detection test (${duration / 1000}s)...`);
    
    const test: MemoryLeakTest = {
      testName: 'Memory Leak Detection',
      initialMemory: 0,
      finalMemory: 0,
      peakMemory: 0,
      samples: [],
      leakDetected: false,
    };

    const startTime = Date.now();
    const sampleInterval = 5000; // Sample every 5 seconds
    
    // Get initial memory
    test.initialMemory = this.getCurrentMemoryUsage();
    test.peakMemory = test.initialMemory;
    
    return new Promise((resolve) => {
      const sampleMemory = () => {
        const currentMemory = this.getCurrentMemoryUsage();
        test.samples.push(currentMemory);
        
        if (currentMemory > test.peakMemory) {
          test.peakMemory = currentMemory;
        }
        
        // Continue sampling if test duration not reached
        if ((Date.now() - startTime) < duration) {
          setTimeout(sampleMemory, sampleInterval);
        } else {
          // Test completed
          test.finalMemory = currentMemory;
          
          // Analyze for memory leaks
          test.leakDetected = this.analyzeMemoryLeak(test);
          
          console.log(`🧠 Memory leak test completed: ${test.leakDetected ? 'LEAK DETECTED' : 'NO LEAKS'}`);
          resolve(test);
        }
      };
      
      // Start sampling
      setTimeout(sampleMemory, sampleInterval);
      
      // Simulate memory-intensive operations during test
      this.simulateMemoryIntensiveOperations(duration);
    });
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof (performance as any).memory !== 'undefined') {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    
    // Fallback estimation
    return this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage (fallback)
   */
  private estimateMemoryUsage(): number {
    // Rough estimation based on DOM nodes and other factors
    const domNodes = document.querySelectorAll('*').length;
    const estimatedPerNode = 0.1; // KB per node
    return (domNodes * estimatedPerNode) / 1024; // MB
  }

  /**
   * Analyze memory samples for leaks
   */
  private analyzeMemoryLeak(test: MemoryLeakTest): boolean {
    if (test.samples.length < 10) return false;
    
    // Calculate trend using linear regression
    const n = test.samples.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = test.samples;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // If slope > 0.1 MB per sample, consider it a leak
    test.leakRate = slope * (60000 / 5000); // Convert to MB per minute
    
    return slope > 0.1;
  }

  /**
   * Simulate memory-intensive operations
   */
  private simulateMemoryIntensiveOperations(duration: number): void {
    const startTime = Date.now();
    const operations = [];
    
    const createMemoryPressure = () => {
      if ((Date.now() - startTime) >= duration) {
        // Clean up
        operations.length = 0;
        return;
      }
      
      // Create some memory pressure
      const data = new Array(10000).fill(0).map(() => ({
        id: Math.random(),
        data: new Array(100).fill(Math.random()),
        timestamp: Date.now(),
      }));
      
      operations.push(data);
      
      // Occasionally clean up to simulate normal memory management
      if (operations.length > 20) {
        operations.splice(0, 10);
      }
      
      setTimeout(createMemoryPressure, 1000);
    };
    
    createMemoryPressure();
  }

  // =============================================================================
  // Bandwidth Optimization Testing (15.2.4)
  // =============================================================================

  /**
   * Test bandwidth optimization
   */
  async runBandwidthOptimizationTest(): Promise<BandwidthOptimizationTest> {
    console.log('📡 Starting bandwidth optimization test...');
    
    const test: BandwidthOptimizationTest = {
      testName: 'Bandwidth Optimization',
      uncompressed: { size: 0, transferTime: 0 },
      compressed: { size: 0, transferTime: 0 },
      optimization: { sizeReduction: 0, speedImprovement: 0 },
    };

    try {
      // Test uncompressed data transfer
      const uncompressedData = this.generateTestData(1024 * 100); // 100KB
      const uncompressedStart = Date.now();
      
      // Simulate network transfer (using fetch to self)
      const uncompressedBlob = new Blob([JSON.stringify(uncompressedData)]);
      test.uncompressed.size = uncompressedBlob.size;
      
      // Simulate transfer time based on size
      test.uncompressed.transferTime = this.simulateTransferTime(test.uncompressed.size);
      
      // Test compressed data transfer
      const compressedData = performanceOptimizationService.compressData(uncompressedData);
      const compressedSize = typeof compressedData === 'string' 
        ? new Blob([compressedData]).size 
        : compressedData.byteLength || new Blob([compressedData]).size;
      
      test.compressed.size = compressedSize;
      test.compressed.transferTime = this.simulateTransferTime(compressedSize);
      
      // Calculate optimizations
      test.optimization.sizeReduction = ((test.uncompressed.size - test.compressed.size) / test.uncompressed.size) * 100;
      test.optimization.speedImprovement = ((test.uncompressed.transferTime - test.compressed.transferTime) / test.uncompressed.transferTime) * 100;
      
      console.log(`📡 Bandwidth test: ${test.optimization.sizeReduction.toFixed(1)}% size reduction, ${test.optimization.speedImprovement.toFixed(1)}% speed improvement`);
      
    } catch (error) {
      console.error('❌ Bandwidth optimization test failed:', error);
    }
    
    return test;
  }

  /**
   * Generate test data for bandwidth testing
   */
  private generateTestData(targetSize: number): any {
    const data = {
      timestamp: Date.now(),
      environment: 'factory',
      cameras: {} as any,
    };
    
    // Generate camera data to reach target size
    const camerasNeeded = Math.ceil(targetSize / 1000); // Rough estimate
    
    for (let i = 0; i < Math.min(camerasNeeded, 10); i++) {
      const cameraId = `c${i.toString().padStart(2, '0')}`;
      data.cameras[cameraId] = {
        frameIndex: i,
        tracks: Array.from({ length: 50 }, (_, trackIndex) => ({
          track_id: trackIndex,
          global_id: `person_${trackIndex}`,
          bbox_xyxy: [100, 100, 200, 300],
          confidence: Math.random(),
          map_coords: [Math.random() * 100, Math.random() * 100],
        })),
        frameImage: 'data:image/jpeg;base64,' + 'A'.repeat(1000), // Simulate base64 image
      };
    }
    
    return data;
  }

  /**
   * Simulate network transfer time
   */
  private simulateTransferTime(sizeBytes: number): number {
    // Simulate various network conditions (ms)
    const networkSpeeds = {
      '3G': 0.5 * 1024 * 1024, // 0.5 Mbps in bytes/sec
      '4G': 10 * 1024 * 1024,  // 10 Mbps in bytes/sec
      'WiFi': 50 * 1024 * 1024, // 50 Mbps in bytes/sec
    };
    
    // Use 4G as baseline
    const bytesPerSecond = networkSpeeds['4G'];
    return (sizeBytes / bytesPerSecond) * 1000; // Convert to ms
  }

  // =============================================================================
  // Real-time Latency Testing (15.2.5)
  // =============================================================================

  /**
   * Measure real-time latency
   */
  async measureRealTimeLatency(duration: number = 30000): Promise<PerformanceMetrics['webSocket']> {
    console.log(`⚡ Measuring real-time latency (${duration / 1000}s)...`);
    
    const metrics = {
      connectionTime: 0,
      messageLatency: 0,
      reconnections: 0,
      dataRate: 0,
    };

    return new Promise((resolve, reject) => {
      const wsUrl = `${APP_CONFIG.WS_BASE_URL}/ws/test`;
      const ws = new WebSocket(wsUrl);
      
      let connected = false;
      let messageCount = 0;
      let latencySum = 0;
      const startTime = Date.now();
      let connectionStartTime = Date.now();
      
      ws.onopen = () => {
        connected = true;
        metrics.connectionTime = Date.now() - connectionStartTime;
        console.log(`⚡ WebSocket connected in ${metrics.connectionTime}ms`);
        
        // Start sending ping messages
        const pingInterval = setInterval(() => {
          if (connected && ws.readyState === WebSocket.OPEN) {
            const pingTime = Date.now();
            ws.send(JSON.stringify({ type: 'ping', timestamp: pingTime }));
          }
        }, 1000);
        
        // End test after duration
        setTimeout(() => {
          clearInterval(pingInterval);
          ws.close();
          
          metrics.messageLatency = messageCount > 0 ? latencySum / messageCount : 0;
          metrics.dataRate = messageCount / (duration / 1000);
          
          console.log(`⚡ Latency test completed: ${metrics.messageLatency.toFixed(1)}ms avg latency`);
          resolve(metrics);
        }, duration);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong' && data.timestamp) {
            const latency = Date.now() - data.timestamp;
            latencySum += latency;
            messageCount++;
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };
      
      ws.onclose = () => {
        connected = false;
        if (messageCount === 0) {
          // If no messages received, resolve with connection-only metrics
          resolve(metrics);
        }
      };
      
      ws.onerror = () => {
        connected = false;
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private initializeMetrics(): PerformanceMetrics {
    return {
      responseTime: { min: Infinity, max: 0, avg: 0, p95: 0, p99: 0 },
      throughput: { requestsPerSecond: 0, dataTransferRate: 0 },
      resource: { cpuUsage: 0, memoryUsage: 0, networkUtilization: 0 },
      rendering: { fps: 0, frameDrops: 0, renderTime: 0 },
      webSocket: { connectionTime: 0, messageLatency: 0, reconnections: 0, dataRate: 0 },
    };
  }

  private selectScenario(scenarios: LoadTestScenario[]): LoadTestScenario {
    const random = Math.random();
    let cumulative = 0;
    
    for (const scenario of scenarios) {
      cumulative += scenario.weight;
      if (random <= cumulative) {
        return scenario;
      }
    }
    
    return scenarios[0]; // Fallback
  }

  private aggregateWorkerMetrics(workerResults: any[]): PerformanceMetrics {
    const totalRequests = workerResults.reduce((sum, result) => sum + result.requests, 0);
    const totalErrors = workerResults.reduce((sum, result) => sum + result.errors, 0);
    const allResponseTimes = workerResults.flatMap(result => result.responseTimes);
    const totalDataTransferred = workerResults.reduce((sum, result) => sum + result.dataTransferred, 0);
    
    // Calculate response time percentiles
    allResponseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(allResponseTimes.length * 0.95);
    const p99Index = Math.floor(allResponseTimes.length * 0.99);
    
    const testDurationSeconds = Math.max(...workerResults.map(r => 
      r.responseTimes.length > 0 ? r.responseTimes.length : 1
    ));
    
    return {
      responseTime: {
        min: Math.min(...allResponseTimes) || 0,
        max: Math.max(...allResponseTimes) || 0,
        avg: allResponseTimes.length > 0 ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : 0,
        p95: allResponseTimes[p95Index] || 0,
        p99: allResponseTimes[p99Index] || 0,
      },
      throughput: {
        requestsPerSecond: totalRequests / testDurationSeconds,
        dataTransferRate: (totalDataTransferred / (1024 * 1024)) / testDurationSeconds, // MB/s
      },
      resource: {
        cpuUsage: 0, // Would need more sophisticated monitoring
        memoryUsage: this.getCurrentMemoryUsage(),
        networkUtilization: 0,
      },
      rendering: {
        fps: 60, // Default assumption
        frameDrops: 0,
        renderTime: 16.67, // 60 FPS = ~16.67ms per frame
      },
      webSocket: {
        connectionTime: 0,
        messageLatency: 0,
        reconnections: 0,
        dataRate: 0,
      },
    };
  }

  private getPerformanceBaseline(): PerformanceMetrics {
    return {
      responseTime: { min: 0, max: 2000, avg: 500, p95: 1000, p99: 1500 },
      throughput: { requestsPerSecond: 100, dataTransferRate: 10 },
      resource: { cpuUsage: 70, memoryUsage: 80, networkUtilization: 60 },
      rendering: { fps: 60, frameDrops: 0, renderTime: 16.67 },
      webSocket: { connectionTime: 500, messageLatency: 100, reconnections: 0, dataRate: 10 },
    };
  }

  /**
   * Get active tests
   */
  getActiveTests(): PerformanceTest[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Get test history
   */
  getTestHistory(): PerformanceTest[] {
    return [...this.testHistory];
  }

  /**
   * Get performance baseline
   */
  getBaseline(): PerformanceMetrics {
    return { ...this.performanceBaseline };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(test: PerformanceTest): string {
    if (!test.metrics) return 'No metrics available';
    
    const report = [
      `# Performance Test Report: ${test.name}`,
      '',
      `**Category**: ${test.category}`,
      `**Status**: ${test.status}`,
      `**Duration**: ${test.duration ? (test.duration / 1000).toFixed(1) : '0'}s`,
      '',
      '## Response Time Metrics',
      `- **Average**: ${test.metrics.responseTime.avg.toFixed(1)}ms`,
      `- **Min**: ${test.metrics.responseTime.min.toFixed(1)}ms`,
      `- **Max**: ${test.metrics.responseTime.max.toFixed(1)}ms`,
      `- **95th Percentile**: ${test.metrics.responseTime.p95.toFixed(1)}ms`,
      `- **99th Percentile**: ${test.metrics.responseTime.p99.toFixed(1)}ms`,
      '',
      '## Throughput Metrics',
      `- **Requests/Second**: ${test.metrics.throughput.requestsPerSecond.toFixed(1)}`,
      `- **Data Transfer Rate**: ${test.metrics.throughput.dataTransferRate.toFixed(1)} MB/s`,
      '',
      '## Resource Utilization',
      `- **CPU Usage**: ${test.metrics.resource.cpuUsage.toFixed(1)}%`,
      `- **Memory Usage**: ${test.metrics.resource.memoryUsage.toFixed(1)}%`,
      `- **Network Utilization**: ${test.metrics.resource.networkUtilization.toFixed(1)}%`,
      '',
    ];

    if (test.errors && test.errors.length > 0) {
      report.push('## Errors');
      test.errors.forEach(error => report.push(`- ${error}`));
    }

    return report.join('\n');
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const performanceValidationService = new PerformanceValidationService();

export default performanceValidationService;