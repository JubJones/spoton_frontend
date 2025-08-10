// State Persistence Service - Enhanced Data Management
// src/services/statePersistenceService.ts

import { compress, decompress } from 'lz-string';
import { EnvironmentId } from '../types/api';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PersistenceConfig {
  key: string;
  version: number;
  compression: boolean;
  encryption: boolean;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum size in bytes
  debounceMs?: number; // Debounce writes to prevent excessive storage ops
}

export interface PersistenceMetadata {
  version: number;
  timestamp: number;
  checksum?: string;
  compressed: boolean;
  size: number;
  environment?: EnvironmentId;
}

export interface PersistentState<T = any> {
  data: T;
  metadata: PersistenceMetadata;
}

export interface StateSnapshot {
  storeId: string;
  data: any;
  timestamp: number;
  environment?: EnvironmentId;
}

export interface StateMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (oldData: any) => any;
}

// ============================================================================
// Storage Adapters
// ============================================================================

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('localStorage.setItem failed:', error);
      throw new Error(
        `Failed to persist state: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('localStorage.clear failed:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.warn('Failed to get localStorage keys:', error);
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      return new Blob(Object.values(localStorage)).size;
    } catch (error) {
      console.warn('Failed to calculate localStorage size:', error);
      return 0;
    }
  }
}

class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'spoton-state-db';
  private storeName = 'state-store';
  private db: IDBDatabase | null = null;

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      console.warn('IndexedDB getItem failed:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB setItem failed:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('IndexedDB removeItem failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('IndexedDB clear failed:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.warn('Failed to get IndexedDB keys:', error);
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      const keys = await this.keys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await this.getItem(key);
        if (value) {
          totalSize += new Blob([key, value]).size;
        }
      }

      return totalSize;
    } catch (error) {
      console.warn('Failed to calculate IndexedDB size:', error);
      return 0;
    }
  }
}

// ============================================================================
// State Persistence Manager
// ============================================================================

export class StatePersistenceService {
  private storage: StorageAdapter;
  private migrations: Map<string, StateMigration[]> = new Map();
  private writeTimers: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries = 3;

  constructor(useIndexedDB = true) {
    this.storage = useIndexedDB ? new IndexedDBAdapter() : new LocalStorageAdapter();
  }

  // ========================================================================
  // Core Persistence Methods
  // ========================================================================

  /**
   * Save state with configuration
   */
  async saveState<T>(key: string, data: T, config: Partial<PersistenceConfig> = {}): Promise<void> {
    const fullConfig: PersistenceConfig = {
      key,
      version: 1,
      compression: true,
      encryption: false,
      debounceMs: 100,
      ...config,
    };

    // Debounce writes if configured
    if (fullConfig.debounceMs && fullConfig.debounceMs > 0) {
      return this.debouncedWrite(key, data, fullConfig);
    }

    return this.performWrite(key, data, fullConfig);
  }

  /**
   * Load state with migration and validation
   */
  async loadState<T>(key: string, config: Partial<PersistenceConfig> = {}): Promise<T | null> {
    const fullConfig: PersistenceConfig = {
      key,
      version: 1,
      compression: true,
      encryption: false,
      ...config,
    };

    try {
      const rawData = await this.storage.getItem(key);
      if (!rawData) {
        return null;
      }

      const persistentState = await this.deserializeState<T>(rawData, fullConfig);
      if (!persistentState) {
        return null;
      }

      // Check TTL
      if (fullConfig.ttl && persistentState.metadata.timestamp + fullConfig.ttl < Date.now()) {
        await this.removeState(key);
        return null;
      }

      // Migrate if necessary
      if (persistentState.metadata.version < fullConfig.version) {
        const migratedData = await this.migrateState(
          key,
          persistentState.data,
          persistentState.metadata.version,
          fullConfig.version
        );

        // Save migrated data
        await this.saveState(key, migratedData, fullConfig);
        return migratedData;
      }

      return persistentState.data;
    } catch (error) {
      console.error(`Failed to load state for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove state from storage
   */
  async removeState(key: string): Promise<void> {
    await this.storage.removeItem(key);

    // Cancel any pending writes
    const timer = this.writeTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.writeTimers.delete(key);
    }
  }

  /**
   * Clear all persisted state
   */
  async clearAllState(): Promise<void> {
    await this.storage.clear();

    // Cancel all pending writes
    this.writeTimers.forEach((timer) => clearTimeout(timer));
    this.writeTimers.clear();
  }

  // ========================================================================
  // Advanced Features
  // ========================================================================

  /**
   * Create state snapshot
   */
  async createSnapshot(storeKeys: string[], environment?: EnvironmentId): Promise<StateSnapshot[]> {
    const snapshots: StateSnapshot[] = [];

    for (const key of storeKeys) {
      try {
        const data = await this.storage.getItem(key);
        if (data) {
          snapshots.push({
            storeId: key,
            data: JSON.parse(data),
            timestamp: Date.now(),
            environment,
          });
        }
      } catch (error) {
        console.warn(`Failed to create snapshot for key ${key}:`, error);
      }
    }

    return snapshots;
  }

  /**
   * Restore from snapshot
   */
  async restoreFromSnapshot(snapshots: StateSnapshot[]): Promise<void> {
    for (const snapshot of snapshots) {
      try {
        await this.storage.setItem(snapshot.storeId, JSON.stringify(snapshot.data));
      } catch (error) {
        console.error(`Failed to restore snapshot for key ${snapshot.storeId}:`, error);
      }
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    totalKeys: number;
    keyDetails: Array<{ key: string; size: number; lastModified?: number }>;
  }> {
    try {
      const keys = await this.storage.keys();
      const totalSize = await this.storage.size();
      const keyDetails: Array<{ key: string; size: number; lastModified?: number }> = [];

      for (const key of keys) {
        try {
          const value = await this.storage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            let lastModified: number | undefined;

            try {
              const parsed = JSON.parse(value);
              if (parsed.metadata?.timestamp) {
                lastModified = parsed.metadata.timestamp;
              }
            } catch {
              // Ignore parsing errors for metadata
            }

            keyDetails.push({ key, size, lastModified });
          }
        } catch (error) {
          console.warn(`Failed to get details for key ${key}:`, error);
        }
      }

      return {
        totalSize,
        totalKeys: keys.length,
        keyDetails,
      };
    } catch (error) {
      console.error('Failed to get storage statistics:', error);
      return {
        totalSize: 0,
        totalKeys: 0,
        keyDetails: [],
      };
    }
  }

  /**
   * Cleanup expired state
   */
  async cleanupExpiredState(): Promise<number> {
    let cleanedCount = 0;

    try {
      const keys = await this.storage.keys();

      for (const key of keys) {
        try {
          const rawData = await this.storage.getItem(key);
          if (rawData) {
            const parsed = JSON.parse(rawData);
            if (parsed.metadata?.timestamp) {
              // Check if data has TTL and is expired (assuming 30 days default)
              const ttl = 30 * 24 * 60 * 60 * 1000; // 30 days
              if (parsed.metadata.timestamp + ttl < Date.now()) {
                await this.removeState(key);
                cleanedCount++;
              }
            }
          }
        } catch (error) {
          // Remove corrupted entries
          await this.removeState(key);
          cleanedCount++;
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired state:', error);
    }

    return cleanedCount;
  }

  // ========================================================================
  // Migration System
  // ========================================================================

  /**
   * Register state migration
   */
  registerMigration(storeKey: string, migration: StateMigration): void {
    if (!this.migrations.has(storeKey)) {
      this.migrations.set(storeKey, []);
    }

    const migrations = this.migrations.get(storeKey)!;
    migrations.push(migration);
    migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  /**
   * Migrate state data
   */
  private async migrateState<T>(
    storeKey: string,
    data: any,
    fromVersion: number,
    toVersion: number
  ): Promise<T> {
    const migrations = this.migrations.get(storeKey) || [];
    let currentData = data;
    let currentVersion = fromVersion;

    for (const migration of migrations) {
      if (migration.fromVersion === currentVersion && migration.toVersion <= toVersion) {
        try {
          currentData = migration.migrate(currentData);
          currentVersion = migration.toVersion;
          console.log(
            `Migrated ${storeKey} from v${migration.fromVersion} to v${migration.toVersion}`
          );
        } catch (error) {
          console.error(`Migration failed for ${storeKey}:`, error);
          throw new Error(
            `State migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    if (currentVersion < toVersion) {
      console.warn(
        `Could not fully migrate ${storeKey} to version ${toVersion} (reached ${currentVersion})`
      );
    }

    return currentData as T;
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Debounced write to prevent excessive storage operations
   */
  private async debouncedWrite<T>(key: string, data: T, config: PersistenceConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel existing timer
      const existingTimer = this.writeTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        this.writeTimers.delete(key);
        try {
          await this.performWrite(key, data, config);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, config.debounceMs);

      this.writeTimers.set(key, timer);
    });
  }

  /**
   * Perform actual write operation
   */
  private async performWrite<T>(key: string, data: T, config: PersistenceConfig): Promise<void> {
    const metadata: PersistenceMetadata = {
      version: config.version,
      timestamp: Date.now(),
      compressed: config.compression,
      size: 0,
    };

    const persistentState: PersistentState<T> = {
      data,
      metadata,
    };

    const serialized = await this.serializeState(persistentState, config);

    // Check size limits
    if (config.maxSize && serialized.length > config.maxSize) {
      throw new Error(
        `State too large: ${serialized.length} bytes exceeds limit of ${config.maxSize} bytes`
      );
    }

    // Update metadata with actual size
    persistentState.metadata.size = serialized.length;
    const finalSerialized = await this.serializeState(persistentState, config);

    // Retry logic
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        await this.storage.setItem(key, finalSerialized);
        return;
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * retries));
      }
    }
  }

  /**
   * Serialize state with optional compression
   */
  private async serializeState<T>(
    state: PersistentState<T>,
    config: PersistenceConfig
  ): Promise<string> {
    let serialized = JSON.stringify(state);

    if (config.compression) {
      serialized = compress(serialized);
    }

    // TODO: Add encryption if enabled
    if (config.encryption) {
      console.warn('Encryption not yet implemented');
    }

    return serialized;
  }

  /**
   * Deserialize state with optional decompression
   */
  private async deserializeState<T>(
    serialized: string,
    config: PersistenceConfig
  ): Promise<PersistentState<T> | null> {
    try {
      let data = serialized;

      // TODO: Add decryption if enabled
      if (config.encryption) {
        console.warn('Decryption not yet implemented');
      }

      // Try decompression first
      if (config.compression) {
        try {
          data = decompress(data) || data;
        } catch (error) {
          // If decompression fails, try parsing as-is (backward compatibility)
          console.warn('Decompression failed, trying uncompressed:', error);
        }
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return null;
    }
  }
}

// ============================================================================
// Global Service Instance
// ============================================================================

export const statePersistenceService = new StatePersistenceService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate checksum for data integrity
 */
export function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Validate state structure
 */
export function validateStateStructure(data: any, schema: any): boolean {
  // Basic validation - can be extended with proper schema validation
  try {
    return typeof data === 'object' && data !== null;
  } catch {
    return false;
  }
}

/**
 * Export state as JSON
 */
export async function exportStateAsJSON(keys: string[]): Promise<string> {
  const service = statePersistenceService;
  const exportData: Record<string, any> = {};

  for (const key of keys) {
    try {
      const data = await service.loadState(key);
      if (data) {
        exportData[key] = data;
      }
    } catch (error) {
      console.warn(`Failed to export state for key ${key}:`, error);
    }
  }

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      data: exportData,
    },
    null,
    2
  );
}

/**
 * Import state from JSON
 */
export async function importStateFromJSON(jsonData: string): Promise<void> {
  try {
    const imported = JSON.parse(jsonData);

    if (!imported.data || typeof imported.data !== 'object') {
      throw new Error('Invalid import data format');
    }

    const service = statePersistenceService;

    for (const [key, data] of Object.entries(imported.data)) {
      await service.saveState(key, data);
    }
  } catch (error) {
    console.error('Failed to import state:', error);
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
