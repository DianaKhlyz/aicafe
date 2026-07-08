// Чекаут: три ветки — доставка / самовывоз ко времени / за столом.
// Гостевой чекаут: авторизация не требуется.
// TODO при подключении DaData: подсказки адреса + проверка зоны
// (/api/delivery/check-address) до оплаты.
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { type OrderMode, useCart } from "../features/cart/store";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { lines, mode, tableCode, setMode, total, clear } = useCart();

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pickupAsap, setPickupAsap] = useState(true);
  const [desiredTime, setDesiredTime] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Предпросмотр «ближайшего времени» — живой расчёт от загрузки кухни
  const { data: eta } = useQuery({
    queryKey: ["pickup-eta"],
    queryFn: async () => {
      const { data, error: apiError } = await api.GET("/api/orders/eta");
      if (apiError) throw apiError;
      return data;
    },
    enabled: mode === "pickup",
    refetchInterval: 60_000,
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const { data, error: apiError } = await api.POST("/api/orders", {
        body: {
          mode,
          items: lines.map((line) => ({ item_id: line.itemId, quantity: line.quantity })),
          phone: phone || null,
          address: mode === "delivery" ? address : null,
          desired_time:
            mode === "pickup" && !pickupAsap && desiredTime
              ? new Date(desiredTime).toISOString()
              : null,
          table_code: mode === "table" ? tableCode : null,
          comment,
        },
      });
      if (apiError) throw apiError;
      return data;
    },
    onSuccess: (order) => {
      clear();
      navigate(`/order/${order.id}`);
    },
    onError: () => setError("Не получилось оформить заказ — проверьте данные и попробуйте ещё раз"),
  });

  if (lines.length === 0) {
    return (
      <div>
        <h1>Оформление заказа</h1>
        <p>
          Корзина пуста. <Link to="/menu">Посмотреть меню</Link>
        </p>
      </div>
    );
  }

  const phoneRequired = mode !== "table";
  const canSubmit =
    !checkout.isPending &&
    (!phoneRequired || phone.trim().length >= 10) &&
    (mode !== "delivery" || address.trim().length > 3) &&
    (mode !== "table" || Boolean(tableCode));

  return (
    <div className="checkout">
      <h1>Оформление заказа</h1>

      <fieldset className="mode-switch">
        <legend>Как получить заказ</legend>
        {(
          [
            ["delivery", "Доставка"],
            ["pickup", "Самовывоз"],
            ["table", tableCode ? `За столом ${tableCode}` : "За столом"],
          ] as [OrderMode, string][]
        ).map(([value, label]) => (
          <label key={value} className={mode === value ? "mode-option mode-option--active" : "mode-option"}>
            <input
              type="radio"
              name="mode"
              checked={mode === value}
              onChange={() => setMode(value)}
              disabled={value === "table" && !tableCode}
            />
            {label}
          </label>
        ))}
      </fieldset>
      {mode === "table" && !tableCode && (
        <p className="form-hint">Режим «за столом» включается при входе по QR-коду на столе.</p>
      )}

      <label className="form-field">
        Телефон{phoneRequired ? "" : " (необязательно)"}
        <input
          type="tel"
          placeholder="+7 900 000-00-00"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      {mode === "delivery" && (
        <label className="form-field">
          Адрес доставки
          <input
            type="text"
            placeholder="Улица, дом, квартира"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
      )}

      {mode === "pickup" && (
        <fieldset className="form-field">
          <legend>Когда приготовить</legend>
          <label>
            <input type="radio" checked={pickupAsap} onChange={() => setPickupAsap(true)} />
            К ближайшему времени{eta ? ` (~${eta.eta_minutes} мин, с учётом загрузки кухни)` : ""}
          </label>
          <label>
            <input type="radio" checked={!pickupAsap} onChange={() => setPickupAsap(false)} />
            К определённому времени
          </label>
          {!pickupAsap && (
            <input
              type="datetime-local"
              value={desiredTime}
              onChange={(event) => setDesiredTime(event.target.value)}
            />
          )}
        </fieldset>
      )}

      <label className="form-field">
        Комментарий к заказу
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} />
      </label>

      <p className="cart-total">К оплате: {total()} ₽</p>
      {error && <p className="form-error">{error}</p>}
      <button
        className="button-primary"
        disabled={!canSubmit}
        onClick={() => {
          setError(null);
          checkout.mutate();
        }}
      >
        {checkout.isPending ? "Оформляем…" : "Оплатить и оформить"}
      </button>
      <p className="form-hint">
        Оплата: СБП или карта — подключается адаптером эквайринга (сейчас заглушка).
      </p>
    </div>
  );
}
