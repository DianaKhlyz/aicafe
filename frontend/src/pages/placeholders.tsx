// Страницы-заглушки: маршруты закреплены, наполнение — по мере реализации
// соответствующих блоков (каждый блок обсуждается перед реализацией,
// см. docs/features.md и docs/open-questions.md).
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div>
      <h1>Кафе</h1>
      <p>Главная: хиты, акции, «повторить прошлый заказ».</p>
      <Link to="/menu" className="button-primary">
        Смотреть меню
      </Link>
    </div>
  );
}

export function PromoPage() {
  // Решается вопрос: зеркало Telegram-канала или форма в админке
  return <h1>Акции и новости</h1>;
}

export function BookingPage() {
  // Интерактивная карта зала: GET /api/booking/sections уже отдаёт схему
  // залов со столами и координатами (мок iiko)
  return <h1>Бронь стола</h1>;
}

export function DeliveryPage() {
  // Карта зон (GET /api/delivery/zones) + условия доставки
  return <h1>Доставка и оплата</h1>;
}

export function AboutPage() {
  return <h1>О кафе</h1>;
}

export function AccountPage() {
  // Личный кабинет: история, повтор заказа, адреса, бонусы.
  // Появится вместе с авторизацией (flash-call / Telegram Gateway)
  return <h1>Личный кабинет</h1>;
}

export function NotFoundPage() {
  return (
    <div>
      <h1>Страница не найдена</h1>
      <Link to="/">На главную</Link>
    </div>
  );
}
