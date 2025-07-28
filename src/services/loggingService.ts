import { monitoringService } from './monitoringService';

export interface LoggingConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  enableFileLogging: boolean;
  enableStructuredLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  remoteEndpoint?: string;
  batchSize: number;
  batchTimeout: number;
  maxRetries: number;
  retryDelay: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  bufferSize: number;
  enablePerformanceLogging: boolean;
  enableSecurityLogging: boolean;
  enableAuditLogging: boolean;
  enableDebugLogging: boolean;
  sensitiveFields: string[];
  enableFieldRedaction: boolean;
  enableSourceMapping: boolean;
  enableStackTraces: boolean;
  enableCorrelationIds: boolean;
  enableContextualLogging: boolean;
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  component?: string;
  action?: string;
  resource?: string;
  environment?: string;
  version?: string;
  buildId?: string;
  commitHash?: string;
  timestamp?: number;
  userAgent?: string;
  ipAddress?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  custom?: Record<string, any>;
}

export interface StructuredLogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  category: string;
  context: LogContext;
  stackTrace?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  fingerprint?: string;
  environment: string;
  version: string;
  source: {
    file?: string;
    line?: number;
    function?: string;
  };
}

export interface LogBatch {
  id: string;
  timestamp: number;
  entries: StructuredLogEntry[];
  compressed?: boolean;
  encrypted?: boolean;
  checksum?: string;
}

export interface LogMetrics {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByCategory: Record<string, number>;
  logsPerSecond: number;
  averageLogSize: number;
  batchesSent: number;
  batchesFailedretries: number;
  lastBatchSent: number;
  bufferUtilization: number;
  remoteEndpointStatus: 'connected' | 'disconnected' | 'error';
}

class LoggingService {
  private config: LoggingConfig;
  private buffer: StructuredLogEntry[] = [];
  private batchQueue: LogBatch[] = [];
  private metrics: LogMetrics = {
    totalLogs: 0,
    logsByLevel: {},
    logsByCategory: {},
    logsPerSecond: 0,
    averageLogSize: 0,
    batchesSent: 0,
    batchesFailedretries: 0,
    lastBatchSent: 0,
    bufferUtilization: 0,
    remoteEndpointStatus: 'disconnected'
  };
  private batchTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  private correlationIdCounter = 0;
  private contextStack: LogContext[] = [];

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: false,
      enableFileLogging: false,
      enableStructuredLogging: true,
      logLevel: 'info',
      batchSize: 100,
      batchTimeout: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      enableCompression: true,
      enableEncryption: false,
      bufferSize: 1000,
      enablePerformanceLogging: true,
      enableSecurityLogging: true,
      enableAuditLogging: true,
      enableDebugLogging: false,
      sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'creditCard'],
      enableFieldRedaction: true,
      enableSourceMapping: true,
      enableStackTraces: true,
      enableCorrelationIds: true,
      enableContextualLogging: true,
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    this.startBatchTimer();
    this.startMetricsTimer();
    this.setupErrorHandling();
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.config.batchTimeout);
  }

  private startMetricsTimer(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.error('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${++this.correlationIdCounter}`;
  }

  private generateFingerprint(message: string, context?: LogContext): string {
    const data = JSON.stringify({ message, context });
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private redactSensitiveFields(data: any): any {
    if (!this.config.enableFieldRedaction) return data;

    const redacted = JSON.parse(JSON.stringify(data));
    
    const redactObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      Object.keys(obj).forEach(key => {
        if (this.config.sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          redactObject(obj[key]);
        }
      });
    };

    redactObject(redacted);
    return redacted;
  }

  private getStackTrace(): string | undefined {
    if (!this.config.enableStackTraces) return undefined;
    
    const error = new Error();
    const stack = error.stack;
    
    if (stack) {
      // Remove the logging service calls from stack trace
      const lines = stack.split('\n');
      return lines.slice(3).join('\n');
    }
    
    return undefined;
  }

  private getSourceInfo(): { file?: string; line?: number; function?: string } {
    if (!this.config.enableSourceMapping) return {};
    
    try {
      const error = new Error();
      const stack = error.stack;
      
      if (stack) {
        const lines = stack.split('\n');
        const callerLine = lines[4]; // Skip logging service calls
        
        if (callerLine) {
          const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
          if (match) {
            return {
              function: match[1],
              file: match[2],
              line: parseInt(match[3], 10)
            };
          }
        }
      }
    } catch (error) {
      // Ignore source mapping errors
    }
    
    return {};
  }

  private createLogEntry(
    level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): StructuredLogEntry {
    const now = Date.now();
    const currentContext = this.contextStack[this.contextStack.length - 1] || {};
    const mergedContext = { ...currentContext, ...context };

    const entry: StructuredLogEntry = {
      timestamp: now,
      level,
      message,
      category: context?.component || 'general',
      context: {
        correlationId: this.config.enableCorrelationIds ? this.generateCorrelationId() : undefined,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.REACT_APP_VERSION || 'unknown',
        buildId: process.env.REACT_APP_BUILD_ID || 'unknown',
        commitHash: process.env.REACT_APP_COMMIT_HASH || 'unknown',
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: now,
        ...this.redactSensitiveFields(mergedContext)
      },
      metadata: this.redactSensitiveFields(metadata),
      stackTrace: level === 'error' || level === 'critical' ? this.getStackTrace() : undefined,
      fingerprint: this.generateFingerprint(message, mergedContext),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.REACT_APP_VERSION || 'unknown',
      source: this.getSourceInfo()
    };

    return entry;
  }

  private addToBuffer(entry: StructuredLogEntry): void {
    this.buffer.push(entry);

    // Keep buffer size manageable
    if (this.buffer.length > this.config.bufferSize) {
      this.buffer = this.buffer.slice(-this.config.bufferSize);
    }

    // Process batch if buffer is full
    if (this.buffer.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  private processBatch(): void {
    if (this.buffer.length === 0) return;

    const batch: LogBatch = {
      id: this.generateCorrelationId(),
      timestamp: Date.now(),
      entries: [...this.buffer]
    };

    this.buffer = [];
    this.batchQueue.push(batch);

    // Send batch if remote logging is enabled
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendBatch(batch);
    }

    // Update metrics
    this.metrics.batchesSent++;
    this.metrics.lastBatchSent = Date.now();
  }

  private async sendBatch(batch: LogBatch, retryCount = 0): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      let data: any = batch;

      // Compress if enabled
      if (this.config.enableCompression) {
        data = await this.compressBatch(batch);
      }

      // Encrypt if enabled
      if (this.config.enableEncryption) {
        data = await this.encryptBatch(data);
      }

      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Batch-Id': batch.id,
          'X-Batch-Size': batch.entries.length.toString(),
          'X-Compression': this.config.enableCompression ? 'gzip' : 'none',
          'X-Encryption': this.config.enableEncryption ? 'aes256' : 'none'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.metrics.remoteEndpointStatus = 'connected';
      
      // Remove batch from queue
      const index = this.batchQueue.indexOf(batch);
      if (index > -1) {
        this.batchQueue.splice(index, 1);
      }

    } catch (error) {
      this.metrics.remoteEndpointStatus = 'error';
      this.metrics.batchesFailedretries++;

      if (retryCount < this.config.maxRetries) {
        setTimeout(() => {
          this.sendBatch(batch, retryCount + 1);
        }, this.config.retryDelay * Math.pow(2, retryCount));
      } else {
        console.error('Failed to send log batch after retries:', error);
      }
    }
  }

  private async compressBatch(batch: LogBatch): Promise<any> {
    // In a real implementation, you would use a compression library
    // For now, we'll just mark it as compressed
    return {
      ...batch,
      compressed: true,
      data: JSON.stringify(batch.entries)
    };
  }

  private async encryptBatch(data: any): Promise<any> {
    // In a real implementation, you would use encryption
    // For now, we'll just mark it as encrypted
    return {
      ...data,
      encrypted: true
    };
  }

  private updateMetrics(): void {
    this.metrics.totalLogs = this.buffer.length;
    this.metrics.bufferUtilization = this.buffer.length / this.config.bufferSize;
    
    // Calculate logs per second
    const now = Date.now();
    const recentLogs = this.buffer.filter(entry => now - entry.timestamp < 60000);
    this.metrics.logsPerSecond = recentLogs.length / 60;

    // Calculate average log size
    if (this.buffer.length > 0) {
      const totalSize = this.buffer.reduce((sum, entry) => 
        sum + JSON.stringify(entry).length, 0);
      this.metrics.averageLogSize = totalSize / this.buffer.length;
    }

    // Update level and category counts
    this.metrics.logsByLevel = {};
    this.metrics.logsByCategory = {};
    
    this.buffer.forEach(entry => {
      this.metrics.logsByLevel[entry.level] = (this.metrics.logsByLevel[entry.level] || 0) + 1;
      this.metrics.logsByCategory[entry.category] = (this.metrics.logsByCategory[entry.category] || 0) + 1;
    });
  }

  private outputToConsole(entry: StructuredLogEntry): void {
    if (!this.config.enableConsoleLogging) return;

    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    const logData = {
      message: entry.message,
      context: entry.context,
      metadata: entry.metadata,
      source: entry.source
    };

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, logData);
        break;
      case 'info':
        console.info(prefix, logData);
        break;
      case 'warn':
        console.warn(prefix, logData);
        break;
      case 'error':
        console.error(prefix, logData, entry.stackTrace);
        break;
      case 'critical':
        console.error(`🚨 ${prefix}`, logData, entry.stackTrace);
        break;
    }
  }

  private logInternal(
    level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, metadata);
    
    // Output to console
    this.outputToConsole(entry);

    // Add to buffer for structured logging
    if (this.config.enableStructuredLogging) {
      this.addToBuffer(entry);
    }

    // Send to monitoring service
    monitoringService.log(level, message, { ...context, ...metadata });
  }

  // Public API
  public debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    if (this.config.enableDebugLogging) {
      this.logInternal('debug', message, context, metadata);
    }
  }

  public info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.logInternal('info', message, context, metadata);
  }

  public warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.logInternal('warn', message, context, metadata);
  }

  public error(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.logInternal('error', message, context, metadata);
  }

  public critical(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.logInternal('critical', message, context, metadata);
  }

  public performance(message: string, duration: number, context?: LogContext): void {
    if (this.config.enablePerformanceLogging) {
      this.logInternal('info', message, {
        ...context,
        component: 'performance',
        duration
      }, {
        type: 'performance',
        duration,
        unit: 'ms'
      });
    }
  }

  public security(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    if (this.config.enableSecurityLogging) {
      this.logInternal('warn', message, {
        ...context,
        component: 'security'
      }, {
        type: 'security',
        ...metadata
      });
    }
  }

  public audit(action: string, resource: string, context?: LogContext): void {
    if (this.config.enableAuditLogging) {
      this.logInternal('info', `${action} ${resource}`, {
        ...context,
        component: 'audit',
        action,
        resource
      }, {
        type: 'audit',
        action,
        resource
      });
    }
  }

  public withContext(context: LogContext): {
    debug: (message: string, metadata?: Record<string, any>) => void;
    info: (message: string, metadata?: Record<string, any>) => void;
    warn: (message: string, metadata?: Record<string, any>) => void;
    error: (message: string, metadata?: Record<string, any>) => void;
    critical: (message: string, metadata?: Record<string, any>) => void;
  } {
    return {
      debug: (message, metadata) => this.debug(message, context, metadata),
      info: (message, metadata) => this.info(message, context, metadata),
      warn: (message, metadata) => this.warn(message, context, metadata),
      error: (message, metadata) => this.error(message, context, metadata),
      critical: (message, metadata) => this.critical(message, context, metadata)
    };
  }

  public pushContext(context: LogContext): void {
    if (this.config.enableContextualLogging) {
      this.contextStack.push(context);
    }
  }

  public popContext(): LogContext | undefined {
    if (this.config.enableContextualLogging) {
      return this.contextStack.pop();
    }
    return undefined;
  }

  public time(label: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.performance(`Timer: ${label}`, duration, { component: 'timer' });
    };
  }

  public getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  public getBuffer(): StructuredLogEntry[] {
    return [...this.buffer];
  }

  public getBatchQueue(): LogBatch[] {
    return [...this.batchQueue];
  }

  public flush(): void {
    this.processBatch();
  }

  public clearBuffer(): void {
    this.buffer = [];
  }

  public updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): LoggingConfig {
    return { ...this.config };
  }

  public getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: LogMetrics;
  } {
    const issues: string[] = [];
    
    if (this.metrics.bufferUtilization > 0.8) {
      issues.push('High buffer utilization');
    }
    
    if (this.metrics.batchesFailedretries > 10) {
      issues.push('High batch failure rate');
    }
    
    if (this.metrics.remoteEndpointStatus === 'error') {
      issues.push('Remote logging endpoint error');
    }
    
    if (this.batchQueue.length > 10) {
      issues.push('High batch queue backlog');
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) overall = 'healthy';
    else if (issues.length <= 2) overall = 'degraded';
    else overall = 'unhealthy';

    return {
      overall,
      issues,
      metrics: this.metrics
    };
  }

  public destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    // Process remaining buffer
    this.processBatch();
  }
}

// Export service instance
export const loggingService = new LoggingService();

// Export class for custom instances
export { LoggingService };