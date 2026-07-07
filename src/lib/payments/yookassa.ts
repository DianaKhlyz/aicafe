import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
} from "./types";

/**
 * Заготовка под ЮKassa (https://yookassa.ru/developers).
 * Выбрана как дефолт: виджет, СБП, фискализация 54-ФЗ на её стороне.
 * Перед фазой 1: заполнить YOOKASSA_SHOP_ID/SECRET_KEY, включить чеки,
 * настроить вебхук payment.succeeded на /api/webhooks/payment.
 */
export class YooKassaProvider implements PaymentProvider {
  private shopId: string;
  private secretKey: string;

  constructor() {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) {
      throw new Error(
        "PAYMENT_PROVIDER=yookassa требует YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY",
      );
    }
    this.shopId = shopId;
    this.secretKey = secretKey;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const res = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ЮKassa использует Basic auth shopId:secretKey
        Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64")}`,
        // ключ идемпотентности: повторный запрос не создаст вторую оплату
        "Idempotence-Key": input.orderId,
      },
      body: JSON.stringify({
        amount: { value: input.amount.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: input.returnUrl },
        description: input.description,
        metadata: { orderId: input.orderId },
        // TODO(54-ФЗ): передавать receipt с позициями чека
      }),
    });
    if (!res.ok) {
      throw new Error(`YooKassa: HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      id: string;
      confirmation?: { confirmation_url?: string };
    };
    return {
      paymentId: data.id,
      confirmationUrl: data.confirmation?.confirmation_url ?? null,
    };
  }

  async parseWebhook(body: unknown): Promise<{ orderId: string } | null> {
    // TODO(безопасность): проверять подлинность вебхука по списку IP ЮKassa
    // или сверять платёж запросом GET /v3/payments/{id} перед доверием.
    const event = body as {
      event?: string;
      object?: { metadata?: { orderId?: string } };
    };
    if (event?.event === "payment.succeeded" && event.object?.metadata?.orderId) {
      return { orderId: event.object.metadata.orderId };
    }
    return null;
  }
}
