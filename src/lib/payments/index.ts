import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./mock";
import { YooKassaProvider } from "./yookassa";

export * from "./types";

let provider: PaymentProvider | null = null;

/** Фабрика эквайринга: PAYMENT_PROVIDER=mock (по умолчанию) | yookassa */
export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    provider =
      process.env.PAYMENT_PROVIDER === "yookassa"
        ? new YooKassaProvider()
        : new MockPaymentProvider();
  }
  return provider;
}
