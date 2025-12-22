// Data Cache Service - Advanced Memory Management
// src/services/dataCacheService.ts

import { compress, decompress } from 'lz-string';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  ttl?: number;
  priority: CachePriority;
  compressed: boolean;
  tags: string[];
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTTL: number; // Default time to live in milliseconds
  compressionThreshold: number; // Size threshold for compression
  enableCompression: boolean;
  enableMetrics: boolean;
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheMetrics {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  missRate: number;
  compressionRatio: number;
  averageAccessTime: number;
  memoryUsage: number;
}

export interface CacheOperation {
  type: 'get' | 'set' | 'delete' | 'clear' | 'cleanup';
  key?: string;
  success: boolean;
  timestamp: number;
  executionTime: number;
  size?: number;
}

export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export enum EvictionStrategy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  TTL = 'ttl', // Time To Live
  SIZE = 'size', // Largest First
  PRIORITY = 'priority', // Lowest Priority First
}

// ============================================================================
// Data Cache Service
// ============================================================================

export class DataCacheService {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private operations: CacheOperation[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxEntries: 1000,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      compressionThreshold: 10 * 1024, // 10KB
      enableCompression: true,
      enableMetrics: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...config,
    };

    this.metrics = {
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      missRate: 0,
      compressionRatio: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
    };

    this.initialize();
  }

  // ========================================================================
  // Initialization and Cleanup
  // ========================================================================

  private initialize(): void {
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);

    // Set up performance monitoring
    if (this.config.enableMetrics && 'PerformanceObserver' in window) {
      this.setupPerformanceMonitoring();
    }

    // Monitor memory usage
    if ('memory' in performance && this.config.enableMetrics) {
      this.startMemoryMonitoring();
    }
  }

  private setupPerformanceMonitoring(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name.startsWith('cache-operation-')) {
            this.updateOperationMetrics(entry.duration);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize || 0;
      }
    }, 30000); // Update every 30 seconds
  }

  // ========================================================================
  // Core Cache Operations
  // ========================================================================

  /**
   * Get item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const operationId = `cache-operation-get-${Date.now()}`;

    try {
      performance.mark(`${operationId}-start`);

      const entry = this.cache.get(key);

      if (!entry) {
        this.recordOperation('get', key, false, performance.now() - startTime);
        return null;
      }

      // Check TTL
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.updateMetrics();
        this.recordOperation('get', key, false, performance.now() - startTime);
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      // Decompress if needed
      let data = entry.data;
      if (entry.compressed && typeof data === 'string') {
        try {
          data = JSON.parse(decompress(data) || data);
        } catch (error) {
          console.error('Failed to decompress cache data:', error);
          this.cache.delete(key);
          this.recordOperation('get', key, false, performance.now() - startTime);
          return null;
        }
      }

      performance.mark(`${operationId}-end`);
      performance.measure(operationId, `${operationId}-start`, `${operationId}-end`);

      this.recordOperation('get', key, true, performance.now() - startTime, entry.size);
      return data as T;
    } catch (error) {
      console.error('Cache get operation failed:', error);
      this.recordOperation('get', key, false, performance.now() - startTime);
      return null;
    }
  }

  /**
   * Set item in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      priority?: CachePriority;
      tags?: string[];
      forceCompression?: boolean;
    } = {}
  ): Promise<boolean> {
    const startTime = performance.now();
    const operationId = `cache-operation-set-${Date.now()}`;

    try {
      performance.mark(`${operationId}-start`);

      // Serialize data
      const serialized = JSON.stringify(data);
      const originalSize = new Blob([serialized]).size;

      // Check if compression is needed
      const shouldCompress =
        options.forceCompression ||
        (this.config.enableCompression && originalSize > this.config.compressionThreshold);

      let processedData: any = serialized;
      let compressed = false;

      if (shouldCompress) {
        try {
          processedData = compress(serialized);
          compressed = true;
        } catch (error) {
          console.warn('Compression failed, storing uncompressed:', error);
        }
      }

      const finalSize = new Blob([processedData]).size;

      // Check cache limits before adding
      if (this.cache.size >= this.config.maxEntries) {
        await this.evictEntries(1);
      }

      // Check size limits
      if (finalSize > this.config.maxSize * 0.1) {
        // Don't allow single entry > 10% of total cache
        console.warn(`Cache entry too large: ${finalSize} bytes`);
        this.recordOperation('set', key, false, performance.now() - startTime, finalSize);
        return false;
      }

      // Make room if needed
      while (this.metrics.totalSize + finalSize > this.config.maxSize) {
        const evicted = await this.evictEntries(1);
        if (evicted === 0) break; // Couldn't evict anything
      }

      const entry: CacheEntry<T> = {
        key,
        data: compressed ? processedData : data,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        size: finalSize,
        ttl: options.ttl || this.config.defaultTTL,
        priority: options.priority || CachePriority.NORMAL,
        compressed,
        tags: options.tags || [],
      };

      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        const existingEntry = this.cache.get(key)!;
        this.metrics.totalSize -= existingEntry.size;
      }

      // Add new entry
      this.cache.set(key, entry);
      this.updateMetrics();

      performance.mark(`${operationId}-end`);
      performance.measure(operationId, `${operationId}-start`, `${operationId}-end`);

      this.recordOperation('set', key, true, performance.now() - startTime, finalSize);
      return true;
    } catch (error) {
      console.error('Cache set operation failed:', error);
      this.recordOperation('set', key, false, performance.now() - startTime);
      return false;
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<boolean> {
    const startTime = performance.now();

    try {
      const entry = this.cache.get(key);
      const success = this.cache.delete(key);

      if (success && entry) {
        this.metrics.totalSize -= entry.size;
        this.updateMetrics();
      }

      this.recordOperation('delete', key, success, performance.now() - startTime, entry?.size);
      return success;
    } catch (error) {
      console.error('Cache delete operation failed:', error);
      this.recordOperation('delete', key, false, performance.now() - startTime);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.updateMetrics();
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const startTime = performance.now();

    try {
      const size = this.cache.size;
      this.cache.clear();
      this.updateMetrics();
      this.recordOperation('clear', undefined, true, performance.now() - startTime);
    } catch (error) {
      console.error('Cache clear operation failed:', error);
      this.recordOperation('clear', undefined, false, performance.now() - startTime);
    }
  }

  // ========================================================================
  // Advanced Operations
  // ========================================================================

  /**
   * Get multiple items from cache
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      })
    );

    return results;
  }

  /**
   * Set multiple items in cache
   */
  async setMultiple<T>(
    entries: Array<{ key: string; data: T; options?: any }>,
    batchSize = 10
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (entry) => {
          try {
            const success = await this.set(entry.key, entry.data, entry.options);
            if (success) successful++;
            else failed++;
          } catch (error) {
            console.error(`Failed to set cache entry ${entry.key}:`, error);
            failed++;
          }
        })
      );
    }

    return { successful, failed };
  }

  /**
   * Get items by tag
   */
  async getByTag<T>(tag: string): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      }
    }

    return results;
  }

  /**
   * Delete items by tag
   */
  async deleteByTag(tag: string): Promise<number> {
    let deletedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const success = await this.delete(key);
      if (success) deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Update TTL for existing entry
   */
  async updateTTL(key: string, newTTL: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.ttl = newTTL;
    entry.timestamp = Date.now(); // Reset timestamp
    return true;
  }

  // ========================================================================
  // Eviction and Cleanup
  // ========================================================================

  /**
   * Evict entries using specified strategy
   */
  async evictEntries(
    count: number,
    strategy: EvictionStrategy = EvictionStrategy.LRU
  ): Promise<number> {
    const entries = Array.from(this.cache.entries());
    let evicted = 0;

    if (entries.length === 0) return 0;

    // Sort entries based on strategy
    let sortedEntries: Array<[string, CacheEntry]>;

    switch (strategy) {
      case EvictionStrategy.LRU:
        sortedEntries = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;

      case EvictionStrategy.LFU:
        sortedEntries = entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;

      case EvictionStrategy.TTL:
        sortedEntries = entries.sort((a, b) => {
          const aExpiry = a[1].timestamp + (a[1].ttl || this.config.defaultTTL);
          const bExpiry = b[1].timestamp + (b[1].ttl || this.config.defaultTTL);
          return aExpiry - bExpiry;
        });
        break;

      case EvictionStrategy.SIZE:
        sortedEntries = entries.sort((a, b) => b[1].size - a[1].size);
        break;

      case EvictionStrategy.PRIORITY:
        sortedEntries = entries.sort((a, b) => a[1].priority - b[1].priority);
        break;

      default:
        sortedEntries = entries;
    }

    // Evict entries
    for (let i = 0; i < Math.min(count, sortedEntries.length); i++) {
      const [key] = sortedEntries[i];
      const success = await this.delete(key);
      if (success) evicted++;
    }

    return evicted;
  }

  /**
   * Perform cleanup of expired entries
   */
  private async performCleanup(): Promise<void> {
    const startTime = performance.now();
    let cleanedCount = 0;

    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const success = await this.delete(key);
      if (success) cleanedCount++;
    }

    if (cleanedCount > 0) {
      console.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }

    this.recordOperation('cleanup', undefined, true, performance.now() - startTime);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() > entry.timestamp + entry.ttl;
  }

  // ========================================================================
  // Metrics and Monitoring
  // ========================================================================

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    if (!this.config.enableMetrics) return;

    let totalSize = 0;
    let compressedSize = 0;
    let uncompressedCount = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      if (entry.compressed) {
        compressedSize += entry.size;
      } else {
        uncompressedCount++;
      }
    }

    this.metrics.totalSize = totalSize;
    this.metrics.entryCount = this.cache.size;

    // Calculate compression ratio
    if (compressedSize > 0 && this.cache.size > uncompressedCount) {
      this.metrics.compressionRatio = compressedSize / totalSize;
    }

    // Calculate hit/miss rates based on recent operations
    const recentOps = this.operations.slice(-100); // Last 100 operations
    const getOps = recentOps.filter((op) => op.type === 'get');
    if (getOps.length > 0) {
      const hits = getOps.filter((op) => op.success).length;
      this.metrics.hitRate = hits / getOps.length;
      this.metrics.missRate = 1 - this.metrics.hitRate;
    }
  }

  /**
   * Record operation for metrics
   */
  private recordOperation(
    type: CacheOperation['type'],
    key: string | undefined,
    success: boolean,
    executionTime: number,
    size?: number
  ): void {
    if (!this.config.enableMetrics) return;

    const operation: CacheOperation = {
      type,
      key,
      success,
      timestamp: Date.now(),
      executionTime,
      size,
    };

    this.operations.push(operation);

    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }
  }

  /**
   * Update operation metrics from performance observer
   */
  private updateOperationMetrics(duration: number): void {
    // Update average access time with exponential moving average
    const alpha = 0.1;
    this.metrics.averageAccessTime =
      this.metrics.averageAccessTime * (1 - alpha) + duration * alpha;
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    entries: number;
    totalSize: string;
    hitRate: string;
    averageEntrySize: string;
    compressionRatio: string;
    memoryUsage: string;
    recentOperations: CacheOperation[];
  } {
    const metrics = this.getMetrics();

    return {
      entries: metrics.entryCount,
      totalSize: this.formatBytes(metrics.totalSize),
      hitRate: `${(metrics.hitRate * 100).toFixed(1)}%`,
      averageEntrySize:
        metrics.entryCount > 0 ? this.formatBytes(metrics.totalSize / metrics.entryCount) : '0 B',
      compressionRatio: `${(metrics.compressionRatio * 100).toFixed(1)}%`,
      memoryUsage: this.formatBytes(metrics.memoryUsage),
      recentOperations: this.operations.slice(-10),
    };
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // ========================================================================
  // Shutdown and Cleanup
  // ========================================================================

  /**
   * Shutdown the cache service
   */
  async shutdown(): Promise<void> {
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Disconnect performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    // Clear cache
    await this.clear();
  }

  /**
   * Export cache data for backup/migration
   */
  async exportCache(): Promise<string> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        entryCount: this.cache.size,
        totalSize: this.metrics.totalSize,
      },
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        // key property is already in entry
        ...entry,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import cache data from backup
   */
  async importCache(data: string, options: { merge: boolean } = { merge: false }): Promise<void> {
    try {
      const importData = JSON.parse(data);

      if (!importData.entries || !Array.isArray(importData.entries)) {
        throw new Error('Invalid cache export format');
      }

      if (!options.merge) {
        await this.clear();
      }

      for (const entryData of importData.entries) {
        const { key, data: entryValue, ...metadata } = entryData;

        // Reconstruct cache entry
        const entry: CacheEntry = {
          key,
          data: entryValue,
          timestamp: metadata.timestamp || Date.now(),
          accessCount: metadata.accessCount || 0,
          lastAccessed: metadata.lastAccessed || Date.now(),
          size: metadata.size || 0,
          ttl: metadata.ttl,
          priority: metadata.priority || CachePriority.NORMAL,
          compressed: metadata.compressed || false,
          tags: metadata.tags || [],
        };

        this.cache.set(key, entry);
      }

      this.updateMetrics();
      console.log(`Imported ${importData.entries.length} cache entries`);
    } catch (error) {
      console.error('Failed to import cache data:', error);
      throw new Error(
        `Cache import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// ============================================================================
// Global Service Instances
// ============================================================================

// Main data cache for application data
export const dataCacheService = new DataCacheService({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  enableCompression: true,
  enableMetrics: true,
});

// Frame cache for image data
export const frameCacheService = new DataCacheService({
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 500,
  enableCompression: false, // Images are already compressed
  enableMetrics: true,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
});

// Temporary cache for short-lived data
export const tempCacheService = new DataCacheService({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxEntries: 200,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute cleanup
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create cache key from components
 */
export function createCacheKey(...components: (string | number)[]): string {
  return components.map((c) => String(c)).join(':');
}

/**
 * Cache with automatic key generation
 */
export async function cacheWithKey<T>(
  keyComponents: (string | number)[],
  data: T,
  options?: any
): Promise<boolean> {
  const key = createCacheKey(...keyComponents);
  return dataCacheService.set(key, data, options);
}

/**
 * Get cached data with automatic key generation
 */
export async function getCachedData<T>(keyComponents: (string | number)[]): Promise<T | null> {
  const key = createCacheKey(...keyComponents);
  return dataCacheService.get<T>(key);
}

export default DataCacheService;
