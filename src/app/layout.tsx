import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cafe } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${cafe.name} — доставка еды и кофе`,
    template: `%s — ${cafe.name}`,
  },
  description: cafe.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
