import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
} from "./types";

/** Эмуляция эквайринга: оплата считается успешной сразу, без редиректа. */
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return { paymentId: `mock-pay-${input.orderId}`, confirmationUrl: null };
  }

  async parseWebhook(): Promise<{ orderId: string } | null> {
    return null; // в mock-режиме вебхуков нет
  }
}
