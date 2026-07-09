// Страницы-заглушки: маршруты закреплены, наполнение — по мере реализации
// соответствующих блоков (каждый блок обсуждается перед реализацией,
// см. docs/features.md и docs/open-questions.md).
import { Link } from "react-router-dom";

export function PromoPage() {
  // Решается вопрос: зеркало Telegram-канала или форма в админке
  return <h1>Акции и новости</h1>;
}

export function AboutPage() {
  return <h1>О кафе</h1>;
}

export function NotFoundPage() {
  return (
    <div>
      <h1>Страница не найдена</h1>
      <Link to="/">На главную</Link>
    </div>
  );
}
