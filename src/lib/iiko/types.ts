/**
 * Доменные типы сайта. Внешние форматы (iikoCloud, mock) маппятся в них
 * внутри реализаций IikoClient — остальной код про iiko ничего не знает.
 */

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sort: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  /** Надбавка к цене, ₽ (может быть 0) */
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  /** Обязательно ли выбрать опцию (например, объём напитка) */
  required: boolean;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  /** Цена, ₽ */
  price: number;
  /** Вес/объём для отображения, например «250 г» или «0.3 л» */
  measure?: string;
  calories?: number;
  tags: string[];
  /** Пока нет фото из iiko/админки — эмодзи-заглушка для карточки */
  emoji: string;
  modifierGroups: ModifierGroup[];
  /** true, если позиция в стоп-листе (скрывается из выдачи) */
  stopped?: boolean;
}

export interface Menu {
  categories: MenuCategory[];
  products: Product[];
  /** Момент последней синхронизации с iiko */
  syncedAt: string;
}

/** Статусы заказа — зеркалим статусную модель доставок iikoCloud */
export type OrderStatus =
  | "Unconfirmed" // принят сайтом, ждёт подтверждения кассой
  | "WaitCooking" // подтверждён, в очереди на кухню
  | "CookingStarted" // готовится
  | "CookingCompleted" // приготовлен
  | "OnWay" // курьер в пути (для самовывоза: можно забирать)
  | "Delivered" // доставлен / выдан
  | "Closed" // закрыт кассой
  | "Cancelled"; // отменён

export type Fulfillment = "delivery" | "pickup";
export type PaymentMethod = "online" | "on_delivery";

export interface OrderItem {
  productId: string;
  name: string;
  /** Цена за единицу с учётом модификаторов, ₽ */
  unitPrice: number;
  quantity: number;
  /** Выбранные модификаторы в читаемом виде: «овсяное молоко, сироп ваниль» */
  options: string[];
}

export interface Order {
  id: string;
  /** Короткий номер для общения с гостем/кухней */
  number: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  customerName: string;
  phone: string;
  address?: string;
  comment?: string;
  items: OrderItem[];
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paid: boolean;
  /** id заказа на стороне iiko (после успешной доставки в кассу) */
  iikoOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  fulfillment: Fulfillment;
  customerName: string;
  phone: string;
  address?: string;
  comment?: string;
  paymentMethod: PaymentMethod;
  items: Array<{
    productId: string;
    quantity: number;
    /** id выбранных опций модификаторов */
    optionIds: string[];
  }>;
}

/**
 * Интерфейс интеграции с iiko. Реализации:
 *  - MockIikoClient  — демо-данные, для разработки и вёрстки (IIKO_MODE=mock)
 *  - CloudIikoClient — боевой iikoCloud API (IIKO_MODE=cloud)
 */
export interface IikoClient {
  getMenu(): Promise<Menu>;
  /** Отправить заказ в кассу. Возвращает id заказа на стороне iiko. */
  createDelivery(order: Order): Promise<{ iikoOrderId: string }>;
  /** Свежий статус заказа (используется как fallback к вебхукам) */
  getOrderStatus(iikoOrderId: string): Promise<OrderStatus>;
}
