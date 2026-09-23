import "server-only";

/**
 * Tiny key-value abstraction used for the place-ID cache and rate limiting.
 * Uses Upstash Redis (REST) when configured, otherwise a per-instance
 * in-memory map (fine for local dev; not shared across serverless instances).
 */
export interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  /** Increment a counter, setting its TTL on creation. Returns the new value. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

export class MemoryStore implements KVStore {
  private map = new Map<string, { value: unknown; expires: number }>();

  constructor(private readonly maxEntries = 5000) {}

  private live(key: string) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return e;
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.live(key)?.value as T) ?? null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const e = this.live(key);
    const next = ((e?.value as number) ?? 0) + 1;
    this.map.set(key, { value: next, expires: e?.expires ?? Date.now() + ttlSeconds * 1000 });
    return next;
  }
}

class UpstashStore implements KVStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<{ result: unknown }[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    return res.json();
  }

  async get<T>(key: string): Promise<T | null> {
    const [r] = await this.pipeline([["GET", key]]);
    return typeof r.result === "string" ? (JSON.parse(r.result) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.pipeline([["SET", key, JSON.stringify(value), "EX", ttlSeconds]]);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const [r] = await this.pipeline([
      ["INCR", key],
      ["EXPIRE", key, ttlSeconds, "NX"],
    ]);
    return Number(r.result);
  }
}

let store: KVStore | undefined;

export function getStore(): KVStore {
  if (!store) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    store = url && token ? new UpstashStore(url, token) : new MemoryStore();
  }
  return store;
}

/** Process-local short-lived cache for API responses we may not persist (details, Instagram). */
export const shortLivedCache = new MemoryStore(2000);
