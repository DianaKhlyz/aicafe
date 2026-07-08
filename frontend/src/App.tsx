import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { MenuPage } from "./pages/Menu";
import { CartPage } from "./pages/Cart";
import { TablePage } from "./pages/Table";
import {
  AboutPage,
  AccountPage,
  BookingPage,
  CheckoutPage,
  DeliveryPage,
  HomePage,
  NotFoundPage,
  OrderPage,
  PromoPage,
} from "./pages/placeholders";
import { useCart } from "./features/cart/store";

const queryClient = new QueryClient();

function Header() {
  const count = useCart((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  return (
    <header className="site-header">
      <nav>
        <Link to="/">Кафе</Link>
        <Link to="/menu">Меню</Link>
        <Link to="/booking">Бронь</Link>
        <Link to="/delivery">Доставка</Link>
        <Link to="/cart">Корзина{count > 0 ? ` (${count})` : ""}</Link>
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
            <Route path="/promo" element={<PromoPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/:orderId" element={<OrderPage />} />
            {/* Режим «за столом»: QR на столе ведёт сюда */}
            <Route path="/t/:tableCode" element={<TablePage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
