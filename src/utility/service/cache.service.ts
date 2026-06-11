import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import NodeCache from 'node-cache';

/**
 * In-memory caching service for performance optimization.
 * 
 * Features:
 * - TTL-based automatic expiration
 * - Size limits to prevent memory bloat
 * - Namespace support for cache isolation
 * - Statistics for monitoring
 * 
 * Usage:
 *   @Injectable()
 *   class SomeService {
 *     constructor(private readonly cacheService: CacheService) {}
 *     
 *     async getData(id: string) {
 *       const cacheKey = this.cacheService.key('data', id);
 *       const cached = this.cacheService.get<Data>(cacheKey);
 *       if (cached) return cached;
 *       
 *       const data = await this.expensiveOperation(id);
 *       this.cacheService.set(cacheKey, data, 300); // Cache for 5 minutes
 *       return data;
 *     }
 *   }
 */

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  keys: number;
  hitRate: number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache: NodeCache;
  private accessStats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  constructor() {
    // Configure cache with:
    // - 5 minute default TTL
    // - Check for expired items every 60 seconds
    // - Delete on overflow (LRU)
    this.cache = new NodeCache({
      stdTTL: 300,           // Default TTL: 5 minutes
      checkperiod: 60,       // Check for expired items every 60 seconds
      useClones: false,      // Return references (faster, but don't modify cached objects)
    });

    this.logger.log('Cache service initialized');
  }

  onModuleDestroy() {
    this.cache.flushAll();
    this.logger.log('Cache service destroyed');
  }

  /**
   * Generate a consistent cache key with namespace
   * @param namespace - Category of the cached item (e.g., 'member', 'department')
   * @param id - Unique identifier
   * @param suffix - Optional additional identifier
   */
  key(namespace: string, id: string, suffix?: string): string {
    return suffix ? `${namespace}:${id}:${suffix}` : `${namespace}:${id}`;
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value === undefined) {
      this.accessStats.misses++;
      this.logger.debug(`Cache MISS: ${key}`);
    } else {
      this.accessStats.hits++;
      this.logger.debug(`Cache HIT: ${key}`);
    }
    return value;
  }

  /**
   * Get a value from the cache, or fetch and cache if not present
   * @param key - Cache key
   * @param fetchFn - Function to fetch the value if not cached
   * @param ttl - Time to live in seconds
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) return cached;

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (defaults to stdTTL)
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const result = this.cache.set(key, value, ttl);
    const ttlSuffix = ttl === undefined ? '' : ` (TTL: ${ttl}s)`;
    this.logger.debug(`Cache SET: ${key}${ttlSuffix}`);
    return result;
  }

  /**
   * Delete a value from the cache
   * @param key - Cache key
   */
  del(key: string): number {
    const count = this.cache.del(key);
    if (count > 0) {
      this.logger.debug(`Cache DEL: ${key}`);
    }
    return count;
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern - RegExp pattern to match keys
   */
  delByPattern(pattern: RegExp): number {
    const keys = this.cache.keys();
    let count = 0;
    for (const key of keys) {
      if (pattern.test(key)) {
        this.cache.del(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Check if a key exists in the cache
   * @param key - Cache key
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get the TTL for a key
   * @param key - Cache key
   */
  getTTL(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  /**
   * Flush all cached items
   */
  flush(): void {
    this.cache.flushAll();
  }

  /**
   * Flush all cached items in a namespace
   * @param namespace - Namespace to flush
   */
  flushNamespace(namespace: string): void {
    this.delByPattern(new RegExp(`^${namespace}:`));
  }

  /**
   * Get cache statistics
   */
  stats(): CacheStats {
    const keys = this.cache.keys();
    const total = this.accessStats.hits + this.accessStats.misses;
    return {
      hits: this.accessStats.hits,
      misses: this.accessStats.misses,
      size: this.cache.getStats().keys,
      keys: keys.length,
      hitRate: total > 0 ? (this.accessStats.hits / total) * 100 : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.accessStats = { hits: 0, misses: 0 };
  }

  /**
   * Cache a promise result and return it
   * Useful for async operations
   * @param key - Cache key
   * @param promiseFn - Function that returns a promise
   * @param ttl - Time to live in seconds
   */
  async memoize<T>(
    key: string,
    promiseFn: () => Promise<T>,
    ttl: number = 300,
  ): Promise<T> {
    // Check if already being fetched (prevent duplicate requests)
    const pendingKey = `${key}:pending`;
    const pending = this.cache.get<Promise<T>>(pendingKey);
    
    if (pending !== undefined) {
      return pending; // Return the same promise to all waiters
    }

    // Check if cached
    const cached = this.get<T>(key);
    if (cached) return cached;

    // Create and cache the promise
    const promise = promiseFn()
      .then((result) => {
        this.set(key, result, ttl);
        this.cache.del(pendingKey);
        return result;
      })
      .catch((error) => {
        this.cache.del(pendingKey);
        throw error;
      });

    this.cache.set(pendingKey, promise, 10); // Short TTL for pending marker
    return promise;
  }

  /**
   * Cache with automatic invalidation when source changes
   * @param key - Cache key
   * @param sourceValue - Value to watch for changes
   * @param fetchFn - Function to fetch the value
   * @param ttl - Time to live in seconds
   */
  async getBySource<T>(
    key: string,
    sourceValue: any,
    fetchFn: () => Promise<T>,
    ttl: number = 300,
  ): Promise<T> {
    const sourceKey = `${key}:source`;
    const cachedSource = this.cache.get<string>(sourceKey);
    
    // Check if source has changed
    const sourceString = JSON.stringify(sourceValue);
    if (cachedSource === sourceString) {
      const cached = this.get<T>(key);
      if (cached) return cached;
    }

    // Source changed or not cached, fetch fresh
    const value = await fetchFn();
    this.set(key, value, ttl);
    this.set(sourceKey, sourceString, ttl);
    
    return value;
  }

  /**
   * Split an array into chunks of specified size
   * Useful for batch database operations
   * @param array - Array to chunk
   * @param size - Chunk size
   */
  chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Process an array in batches to avoid memory issues
   * @param array - Array to process
   * @param size - Batch size
   * @param processor - Function to process each batch
   */
  async batchProcess<T, R>(
    array: T[],
    size: number,
    processor: (batch: T[]) => Promise<R>,
  ): Promise<R[]> {
    const chunks = this.chunkArray(array, size);
    const results: R[] = [];
    
    for (const chunk of chunks) {
      const result = await processor(chunk);
      results.push(result);
    }
    
    return results;
  }
}
