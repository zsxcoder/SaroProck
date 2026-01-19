// src/lib/kv-proxy.ts
// Cloudflare Worker KV 代理客户端

type KVProxyResponse<T = any> = {
  success: boolean;
  value?: T;
  error?: string;
};

class KVProxy {
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    this.baseUrl = import.meta.env.CLOUDFLARE_WORKER_URL || "";
    this.apiToken = import.meta.env.CLOUDFLARE_API_TOKEN || "";
  }

  /**
   * 从 KV 获取值
   */
  async get<T = string>(key: string): Promise<T | null> {
    if (!this.baseUrl || !this.apiToken) {
      console.warn("KV proxy not configured");
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/kv/get?key=${encodeURIComponent(key)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      const data = (await response.json()) as KVProxyResponse<string>;
      if (!data.success || data.value === null) {
        return null;
      }

      // 尝试解析 JSON
      try {
        if (typeof data.value === "string") {
          return JSON.parse(data.value) as T;
        }
        return data.value as unknown as T;
      } catch {
        return data.value as unknown as T;
      }
    } catch (error) {
      console.error(`KV get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 向 KV 存储值
   */
  async put(key: string, value: any): Promise<boolean> {
    if (!this.baseUrl || !this.apiToken) {
      console.warn("KV proxy not configured");
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/kv/put`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          value: typeof value === "string" ? value : JSON.stringify(value),
        }),
      });

      const data = (await response.json()) as KVProxyResponse;
      return data.success;
    } catch (error) {
      console.error(`KV put error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 递增数值
   */
  async increment(key: string, delta: number = 1): Promise<number | null> {
    if (!this.baseUrl || !this.apiToken) {
      console.warn("KV proxy not configured");
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/kv/increment?key=${encodeURIComponent(key)}&delta=${delta}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      const data = (await response.json()) as KVProxyResponse<number>;
      if (!data.success) {
        return null;
      }

      return data.value || null;
    } catch (error) {
      console.error(`KV increment error for key ${key}:`, error);
      return null;
    }
  }
}

export const kvProxy = new KVProxy();
