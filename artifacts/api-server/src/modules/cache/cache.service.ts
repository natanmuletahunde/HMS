import { Injectable } from '@nestjs/common';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number; // ms timestamp
}

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  get<T = any>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() > entry.expiresAt) { this.store.delete(key); this.misses++; return undefined; }
    this.hits++;
    return entry.value as T;
  }

  set<T = any>(key: string, value: T, ttlSeconds = 60): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string): void { this.store.delete(key); }

  /** Delete all keys that start with the given prefix. */
  delByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  flush(): void { this.store.clear(); }

  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? parseFloat((this.hits / total * 100).toFixed(1)) : 0,
      keys: [...this.store.keys()].slice(0, 50),
    };
  }
}
