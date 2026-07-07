/**
 * Интерфейс эквайринга. Реализации:
 *  - MockPaymentProvider — эмуляция мгновенной успешной оплаты (по умолчанию)
 *  - YooKassaProvider    — заготовка под ЮKassa (карта + СБП, чеки 54-ФЗ)
 *
 * Интерфейс намеренно узкий, чтобы провайдера можно было заменить
 * (T-Bank Касса, CloudPayments) без правок остального кода.
 */

export interface CreatePaymentInput {
  orderId: string;
  /** Сумма, ₽ */
  amount: number;
  description: string;
  /** Куда вернуть гостя после оплаты */
  returnUrl: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  /**
   * URL страницы оплаты, куда редиректим гостя.
   * null — оплата подтверждена мгновенно (mock-режим).
   */
  confirmationUrl: string | null;
}

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * Разбор вебхука провайдера: вернуть orderId успешно оплаченного заказа
   * или null, если событие не про успешную оплату.
   */
  parseWebhook(body: unknown): Promise<{ orderId: string } | null>;
}
