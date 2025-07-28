export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  evictions: number;
  compressionRatio: number;
}

export interface CacheConfiguration {
  maxSize: number;
  maxEntries: number;
  defaultTTL: number;
  strategy: 'lru' | 'lfu' | 'fifo' | 'random';
  compression: boolean;
  persistence: boolean;
  storageKey: string;
  cleanupInterval: number;
  enableMetrics: boolean;
  enableLogging: boolean;
}

class CacheService {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSize: 0,
    entryCount: 0,
    evictions: 0,
    compressionRatio: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private config: CacheConfiguration;
  private accessOrder: string[] = [];

  constructor(config: Partial<CacheConfiguration> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTTL: 300000, // 5 minutes
      strategy: 'lru',
      compression: true,
      persistence: false,
      storageKey: 'spoton-cache',
      cleanupInterval: 60000, // 1 minute
      enableMetrics: true,
      enableLogging: false,
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.config.persistence) {
      this.loadFromPersistence();
    }

    this.startCleanupTimer();
    this.updateStats();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private loadFromPersistence(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach(([key, entry]: [string, CacheEntry]) => {
          if (entry.timestamp + entry.ttl > Date.now()) {
            this.cache.set(key, entry);
          }
        });
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Failed to load cache from persistence:', error);
      }
    }
  }

  private saveToPersistence(): void {
    if (!this.config.persistence) return;

    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Failed to save cache to persistence:', error);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    this.cache.forEach((entry, key) => {
      if (entry.timestamp + entry.ttl < now) {
        expiredKeys.push(key);
      }
    });

    // Remove expired entries
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    // Check size limits and evict if necessary
    this.enforceSize();
    this.updateStats();

    if (this.config.persistence) {
      this.saveToPersistence();
    }
  }

  private enforceSize(): void {
    if (this.cache.size <= this.config.maxEntries && this.getTotalSize() <= this.config.maxSize) {
      return;
    }

    const keysToEvict = this.getEvictionCandidates();
    
    keysToEvict.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.evictions++;
    });
  }

  private getEvictionCandidates(): string[] {
    const candidates: string[] = [];
    const entries = Array.from(this.cache.entries());

    switch (this.config.strategy) {
      case 'lru':
        // Least Recently Used
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'lfu':
        // Least Frequently Used
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'fifo':
        // First In, First Out
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        break;
      case 'random':
        // Random eviction
        entries.sort(() => Math.random() - 0.5);
        break;
    }

    // Remove entries until under limits
    while (
      (this.cache.size > this.config.maxEntries || this.getTotalSize() > this.config.maxSize) &&
      entries.length > 0
    ) {
      const [key] = entries.shift()!;
      candidates.push(key);
    }

    return candidates;
  }

  private getTotalSize(): number {
    let size = 0;
    this.cache.forEach(entry => {
      size += entry.size;
    });
    return size;
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Approximate size in bytes
  }

  private compressData(data: any): string {
    if (!this.config.compression) return data;
    
    try {
      // Simple compression using JSON stringification
      // In a real app, you might use a library like pako for gzip compression
      return JSON.stringify(data);
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Compression failed:', error);
      }
      return data;
    }
  }

  private decompressData(data: string): any {
    if (!this.config.compression) return data;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Decompression failed:', error);
      }
      return data;
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private updateStats(): void {
    this.stats.entryCount = this.cache.size;
    this.stats.totalSize = this.getTotalSize();
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;
    
    // Calculate compression ratio
    let uncompressedSize = 0;
    let compressedSize = 0;
    
    this.cache.forEach(entry => {
      if (entry.compressed) {
        compressedSize += entry.size;
        uncompressedSize += this.calculateSize(this.decompressData(entry.data));
      } else {
        uncompressedSize += entry.size;
        compressedSize += entry.size;
      }
    });
    
    this.stats.compressionRatio = uncompressedSize > 0 ? compressedSize / uncompressedSize : 1;
  }

  // Public API
  public set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const actualTTL = ttl || this.config.defaultTTL;
    const compressed = this.config.compression;
    const processedData = compressed ? this.compressData(data) : data;
    const size = this.calculateSize(processedData);

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      ttl: actualTTL,
      accessCount: 1,
      lastAccessed: now,
      size,
      compressed
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.enforceSize();
    this.updateStats();

    if (this.config.enableLogging) {
      console.log(`Cache set: ${key} (${size} bytes, TTL: ${actualTTL}ms)`);
    }
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (entry.timestamp + entry.ttl < now) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateAccessOrder(key);
    
    this.stats.hits++;
    this.updateStats();

    const data = entry.compressed ? this.decompressData(entry.data) : entry.data;
    
    if (this.config.enableLogging) {
      console.log(`Cache hit: ${key} (accessed ${entry.accessCount} times)`);
    }
    
    return data;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    const now = Date.now();
    if (entry.timestamp + entry.ttl < now) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }
    
    return true;
  }

  public delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.removeFromAccessOrder(key);
      this.updateStats();
      
      if (this.config.enableLogging) {
        console.log(`Cache delete: ${key}`);
      }
    }
    return result;
  }

  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.updateStats();
    
    if (this.config.persistence) {
      localStorage.removeItem(this.config.storageKey);
    }

    if (this.config.enableLogging) {
      console.log('Cache cleared');
    }
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  public values(): any[] {
    return Array.from(this.cache.values()).map(entry => 
      entry.compressed ? this.decompressData(entry.data) : entry.data
    );
  }

  public entries(): [string, any][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [
      key,
      entry.compressed ? this.decompressData(entry.data) : entry.data
    ]);
  }

  public size(): number {
    return this.cache.size;
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public getConfig(): CacheConfiguration {
    return { ...this.config };
  }

  public updateConfig(config: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...config };
    
    // Restart cleanup timer if interval changed
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startCleanupTimer();
    }
    
    // Enforce new size limits
    this.enforceSize();
    this.updateStats();
  }

  public getEntryDetails(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    return {
      ...entry,
      data: entry.compressed ? this.decompressData(entry.data) : entry.data
    };
  }

  public getExpiredEntries(): string[] {
    const now = Date.now();
    const expired: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp + entry.ttl < now) {
        expired.push(key);
      }
    });
    
    return expired;
  }

  public touch(key: string, ttl?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    entry.lastAccessed = now;
    entry.accessCount++;
    
    if (ttl !== undefined) {
      entry.ttl = ttl;
    }
    
    this.updateAccessOrder(key);
    this.updateStats();
    
    return true;
  }

  public invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.delete(key));
    
    if (this.config.enableLogging) {
      console.log(`Cache invalidated ${keysToDelete.length} entries matching pattern: ${pattern}`);
    }
    
    return keysToDelete.length;
  }

  public getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: {
      hitRate: number;
      sizeUtilization: number;
      entryUtilization: number;
      compressionRatio: number;
    };
  } {
    const issues: string[] = [];
    const metrics = {
      hitRate: this.stats.hitRate,
      sizeUtilization: this.stats.totalSize / this.config.maxSize,
      entryUtilization: this.stats.entryCount / this.config.maxEntries,
      compressionRatio: this.stats.compressionRatio
    };

    if (metrics.hitRate < 0.5) {
      issues.push('Low cache hit rate');
    }
    
    if (metrics.sizeUtilization > 0.9) {
      issues.push('High memory usage');
    }
    
    if (metrics.entryUtilization > 0.9) {
      issues.push('High entry count');
    }
    
    if (this.stats.evictions > 100) {
      issues.push('High eviction rate');
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) overall = 'healthy';
    else if (issues.length <= 2) overall = 'degraded';
    else overall = 'unhealthy';

    return { overall, issues, metrics };
  }

  public export(): any {
    const data = {
      entries: Array.from(this.cache.entries()),
      stats: this.stats,
      config: this.config,
      accessOrder: this.accessOrder,
      timestamp: Date.now()
    };
    
    return data;
  }

  public import(data: any): void {
    try {
      this.clear();
      
      if (data.entries) {
        data.entries.forEach(([key, entry]: [string, CacheEntry]) => {
          if (entry.timestamp + entry.ttl > Date.now()) {
            this.cache.set(key, entry);
          }
        });
      }
      
      if (data.accessOrder) {
        this.accessOrder = data.accessOrder.filter((key: string) => this.cache.has(key));
      }
      
      this.updateStats();
      
      if (this.config.enableLogging) {
        console.log('Cache imported successfully');
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Failed to import cache:', error);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.config.persistence) {
      this.saveToPersistence();
    }
    
    this.clear();
  }
}

// Create global cache instances
export const globalCache = new CacheService();
export const apiCache = new CacheService({
  storageKey: 'spoton-api-cache',
  defaultTTL: 60000, // 1 minute
  maxSize: 10 * 1024 * 1024, // 10MB
  compression: true
});

export const imageCache = new CacheService({
  storageKey: 'spoton-image-cache',
  defaultTTL: 3600000, // 1 hour
  maxSize: 100 * 1024 * 1024, // 100MB
  compression: false
});

export const componentCache = new CacheService({
  storageKey: 'spoton-component-cache',
  defaultTTL: 1800000, // 30 minutes
  maxSize: 5 * 1024 * 1024, // 5MB
  compression: true
});

// Export the service class
export { CacheService };