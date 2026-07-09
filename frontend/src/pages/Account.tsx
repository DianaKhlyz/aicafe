// Личный кабинет: вход по телефону (мягкий — гостевой чекаут остаётся),
// история заказов, повтор в 1 клик. Провайдер кодов — заглушка (0000),
// боевой flash-call/Telegram Gateway подключается адаптером.
import { useState } from "react";
import { useAuth, useOrderHistory } from "../features/auth/useAuth";
import { RepeatOrderButton } from "../features/auth/RepeatOrderButton";

const MODE_LABELS: Record<string, string> = {
  delivery: "Доставка",
  pickup: "Самовывоз",
  table: "За столом",
};

function LoginForm() {
  const { requestCode, verify } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");

  if (step === "phone") {
    return (
      <div className="login-form">
        <p>Вход сохранит историю заказов и включит повтор в один клик.</p>
        <label className="form-field">
          Телефон
          <input
            type="tel"
            placeholder="+7 900 000-00-00"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <button
          className="button-primary"
          disabled={phone.trim().length < 10 || requestCode.isPending}
          onClick={() => requestCode.mutate(phone, { onSuccess: () => setStep("code") })}
        >
          Получить код
        </button>
      </div>
    );
  }

  return (
    <div className="login-form">
      <label className="form-field">
        Код из звонка/сообщения
        <input
          inputMode="numeric"
          placeholder="0000"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      {verify.isError && <p className="form-error">Неверный код, попробуйте ещё раз.</p>}
      <button
        className="button-primary"
        disabled={code.trim().length < 4 || verify.isPending}
        onClick={() => verify.mutate({ phone, code })}
      >
        Войти
      </button>
      <p className="form-hint">Демо-режим: подходит код 0000.</p>
    </div>
  );
}

export function AccountPage() {
  const { me, isPending, logout } = useAuth();
  const history = useOrderHistory(Boolean(me));

  if (isPending) return <p>Загружаем…</p>;

  if (!me) {
    return (
      <div>
        <h1>Личный кабинет</h1>
        <LoginForm />
      </div>
    );
  }

  return (
    <div>
      <h1>Личный кабинет</h1>
      <p>
        {me.phone}{" "}
        <button className="link-button" onClick={() => logout.mutate()}>
          Выйти
        </button>
      </p>

      <h2>История заказов</h2>
      {history.data && history.data.length === 0 && (
        <p className="form-hint">Заказов пока нет — они появятся здесь после первого заказа.</p>
      )}
      <ul className="order-history">
        {(history.data ?? []).map((order) => (
          <li key={order.id}>
            <span>
              {new Date(order.created_at).toLocaleDateString("ru-RU")} ·{" "}
              {MODE_LABELS[order.mode]} · {order.amount} ₽
            </span>
            <RepeatOrderButton order={order} />
          </li>
        ))}
      </ul>
    </div>
  );
}
