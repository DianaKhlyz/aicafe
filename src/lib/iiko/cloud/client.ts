import type { IikoClient, Menu, Order, OrderStatus, Product } from "../types";

/**
 * Заготовка боевого клиента iikoCloud API (https://api-ru.iiko.services).
 *
 * Скелет рабочий: авторизация с кэшем токена, запросы, маппинг номенклатуры.
 * Перед запуском фазы 1 контракты нужно сверить с актуальным Swagger —
 * места, требующие проверки, помечены `TODO(iiko)`.
 */

const BASE_URL = "https://api-ru.iiko.services";
/** Токен живёт ~1 час — обновляем заранее */
const TOKEN_TTL_MS = 55 * 60 * 1000;

interface CloudConfig {
  apiLogin: string;
  organizationId: string;
  terminalGroupId: string;
  onlinePaymentTypeId?: string;
}

export function cloudConfigFromEnv(): CloudConfig {
  const apiLogin = process.env.IIKO_API_LOGIN;
  const organizationId = process.env.IIKO_ORGANIZATION_ID;
  const terminalGroupId = process.env.IIKO_TERMINAL_GROUP_ID;
  if (!apiLogin || !organizationId || !terminalGroupId) {
    throw new Error(
      "IIKO_MODE=cloud требует IIKO_API_LOGIN, IIKO_ORGANIZATION_ID и IIKO_TERMINAL_GROUP_ID (см. .env.example)",
    );
  }
  return {
    apiLogin,
    organizationId,
    terminalGroupId,
    onlinePaymentTypeId: process.env.IIKO_ONLINE_PAYMENT_TYPE_ID,
  };
}

export class CloudIikoClient implements IikoClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private config: CloudConfig) {}

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.value;
    }
    const res = await fetch(`${BASE_URL}/api/1/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiLogin: this.config.apiLogin }),
    });
    if (!res.ok) {
      throw new Error(`iiko access_token: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { token: string };
    this.token = { value: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return data.token;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`iiko ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  async getMenu(): Promise<Menu> {
    // TODO(iiko): сверить схему ответа nomenclature с актуальным Swagger;
    // рассмотреть /api/2/menu (внешнее меню iikoWeb) для веб-описаний и фото.
    type NomenclatureResponse = {
      productCategories?: Array<{ id: string; name: string }>;
      groups?: Array<{ id: string; name: string; order?: number }>;
      products?: Array<{
        id: string;
        parentGroup?: string;
        name: string;
        description?: string;
        sizePrices?: Array<{ price?: { currentPrice?: number } }>;
        measureUnit?: string;
        energyFullAmount?: number;
      }>;
    };

    const data = await this.post<NomenclatureResponse>(
      "/api/1/nomenclature",
      { organizationId: this.config.organizationId },
    );

    const categories = (data.groups ?? []).map((g, i) => ({
      id: g.id,
      name: g.name,
      sort: g.order ?? i,
    }));

    const products: Product[] = (data.products ?? []).map((p) => ({
      id: p.id,
      categoryId: p.parentGroup ?? "",
      name: p.name,
      description: p.description ?? "",
      price: p.sizePrices?.[0]?.price?.currentPrice ?? 0,
      measure: p.measureUnit,
      calories: p.energyFullAmount,
      tags: [],
      emoji: "🍽️", // до подключения фото из iiko/админки
      // TODO(iiko): маппинг групп модификаторов (groupModifiers/modifiers)
      modifierGroups: [],
    }));

    return { categories, products, syncedAt: new Date().toISOString() };
  }

  async createDelivery(order: Order): Promise<{ iikoOrderId: string }> {
    // TODO(iiko): сверить полный контракт deliveries/create (адрес, способ
    // оплаты, отложенные заказы completeBefore) с актуальным Swagger.
    type CreateResponse = {
      correlationId: string;
      orderInfo?: { id?: string };
    };

    const payload = {
      organizationId: this.config.organizationId,
      terminalGroupId: this.config.terminalGroupId,
      order: {
        phone: order.phone,
        comment: order.comment,
        customer: { name: order.customerName },
        items: order.items.map((i) => ({
          type: "Product",
          productId: i.productId,
          amount: i.quantity,
        })),
        payments:
          order.paid && this.config.onlinePaymentTypeId
            ? [
                {
                  paymentTypeKind: "Card",
                  paymentTypeId: this.config.onlinePaymentTypeId,
                  sum: order.total,
                  isProcessedExternally: true,
                },
              ]
            : [],
        orderServiceType:
          order.fulfillment === "delivery" ? "DeliveryByCourier" : "DeliveryPickUp",
      },
    };

    const data = await this.post<CreateResponse>(
      "/api/1/deliveries/create",
      payload,
    );

    // ВАЖНО: успех HTTP ещё не значит, что заказ дошёл до кассы.
    // TODO(iiko): подтверждать доставку заказа через /api/1/commands/status
    // по data.correlationId (Success/Error) и алертить при ошибке.
    return { iikoOrderId: data.orderInfo?.id ?? data.correlationId };
  }

  async getOrderStatus(iikoOrderId: string): Promise<OrderStatus> {
    // TODO(iiko): /api/1/deliveries/by_id — fallback к вебхукам
    // DeliveryOrderUpdate (основной канал статусов).
    void iikoOrderId;
    return "Unconfirmed";
  }
}
