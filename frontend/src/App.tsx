import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { MenuPage } from "./pages/Menu";
import { DishPage } from "./pages/Dish";
import { CartPage } from "./pages/Cart";
import { CheckoutPage } from "./pages/Checkout";
import { OrderPage } from "./pages/Order";
import { TablePage } from "./pages/Table";
import { BookingPage } from "./pages/Booking";
import { AccountPage } from "./pages/Account";
import { DemoPanelPage } from "./pages/DemoPanel";
import { AboutPage, NotFoundPage, PromoPage } from "./pages/placeholders";

// Leaflet тяжёлый — грузим страницу «Доставка» отдельным чанком
const DeliveryPage = lazy(() =>
  import("./pages/Delivery").then((module) => ({ default: module.DeliveryPage })),
);
import { useCart } from "./features/cart/store";
import { FloatingCart } from "./features/cart/FloatingCart";

const queryClient = new QueryClient();

function Header() {
  const count = useCart((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  return (
    <header className="site-header">
      <nav>
        <Link to="/" className="brand">
          <span className="coaster seal">БЯ</span>
          <span>
            <b>Брискет Ярд</b>
            <span className="sub">гастропаб · с 2026</span>
          </span>
        </Link>
        <Link to="/menu">Меню</Link>
        <Link to="/booking">Бронь</Link>
        <Link to="/delivery">Доставка</Link>
        <Link to="/account">Кабинет</Link>
        {/* Якорь для анимации «полёта» в корзину */}
        <Link to="/cart" id="cart-anchor" className="cart-link">
          Корзина{count > 0 ? ` (${count})` : ""}
        </Link>
      </nav>
    </header>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Header />
        <main className="site-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/menu/:dishId" element={<DishPage />} />
            <Route path="/promo" element={<PromoPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route
              path="/delivery"
              element={
                <Suspense fallback={<p>Загружаем карту…</p>}>
                  <DeliveryPage />
                </Suspense>
              }
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/:orderId" element={<OrderPage />} />
            {/* Режим «за столом»: QR на столе ведёт сюда */}
            <Route path="/t/:tableCode" element={<TablePage />} />
            <Route path="/account" element={<AccountPage />} />
            {/* Демо-пульт: не в навигации, работает только в мок-режиме */}
            <Route path="/demo" element={<DemoPanelPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <FloatingCart />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
