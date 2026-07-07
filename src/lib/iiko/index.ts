import type { IikoClient } from "./types";
import { MockIikoClient } from "./mock/client";
import { CloudIikoClient, cloudConfigFromEnv } from "./cloud/client";

export * from "./types";

let client: IikoClient | null = null;

/** Фабрика клиента iiko: IIKO_MODE=mock (по умолчанию) | cloud */
export function getIikoClient(): IikoClient {
  if (!client) {
    client =
      process.env.IIKO_MODE === "cloud"
        ? new CloudIikoClient(cloudConfigFromEnv())
        : new MockIikoClient();
  }
  return client;
}
