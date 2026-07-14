// Unified secrets manager: GCP Secret Manager + Cloudflare KV + local .env
// Abstracts away where secrets come from

export interface SecretsConfig {
  gcpProjectId?: string;
  gcpEnabled: boolean;
  cfKvEnabled: boolean;
  localEnvEnabled: boolean;
}

export interface GCPSecretsClient {
  getSecret(name: string): Promise<string | null>;
  setSecret(name: string, value: string): Promise<void>;
}

export interface CFKVClient {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export class SecretsManager {
  private gcpClient?: GCPSecretsClient;
  private cfkvClient?: CFKVClient;
  private localEnv: Record<string, string>;

  constructor(
    private config: SecretsConfig,
    gcpClient?: GCPSecretsClient,
    cfkvClient?: CFKVClient,
    localEnv?: Record<string, string>
  ) {
    this.gcpClient = gcpClient;
    this.cfkvClient = cfkvClient;
    this.localEnv = localEnv || (typeof process !== "undefined" ? process.env : {});
  }

  /**
   * Get a secret, checking sources in order:
   * 1. Local environment (.env.local)
   * 2. Cloudflare KV
   * 3. GCP Secret Manager
   */
  async getSecret(key: string): Promise<string | null> {
    // Try local env first
    if (this.config.localEnvEnabled && this.localEnv[key]) {
      return this.localEnv[key];
    }

    // Try CF KV
    if (this.config.cfKvEnabled && this.cfkvClient) {
      const value = await this.cfkvClient.get(key);
      if (value) return value;
    }

    // Try GCP Secret Manager
    if (this.config.gcpEnabled && this.gcpClient) {
      const value = await this.gcpClient.getSecret(key);
      if (value) return value;
    }

    return null;
  }

  /**
   * Set a secret (prefers GCP, falls back to CF KV, then local)
   */
  async setSecret(key: string, value: string): Promise<void> {
    if (this.config.gcpEnabled && this.gcpClient) {
      await this.gcpClient.setSecret(key, value);
      return;
    }

    if (this.config.cfKvEnabled && this.cfkvClient) {
      await this.cfkvClient.put(key, value);
      return;
    }

    if (this.config.localEnvEnabled) {
      this.localEnv[key] = value;
      return;
    }

    throw new Error("No secrets backend configured");
  }

  /**
   * Get multiple secrets in parallel
   */
  async getSecrets(keys: string[]): Promise<Record<string, string | null>> {
    const results = await Promise.all(keys.map(key => this.getSecret(key)));
    return Object.fromEntries(keys.map((key, i) => [key, results[i]]));
  }

  /**
   * Assert that a secret exists, throw if missing
   */
  async requireSecret(key: string): Promise<string> {
    const value = await this.getSecret(key);
    if (!value) {
      throw new Error(`Missing required secret: ${key}`);
    }
    return value;
  }
}

/**
 * Create a SecretsManager for Worker environment (uses CF KV + local fallback)
 */
export function createWorkerSecretsManager(
  cfkvNamespace: KVNamespace,
  localEnv?: Record<string, string>
): SecretsManager {
  const cfkvAdapter: CFKVClient = {
    get: (key) => cfkvNamespace.get(key),
    put: (key, value, options) => cfkvNamespace.put(key, value, options)
  };

  return new SecretsManager(
    {
      gcpEnabled: false,
      cfKvEnabled: true,
      localEnvEnabled: true
    },
    undefined,
    cfkvAdapter,
    localEnv
  );
}
