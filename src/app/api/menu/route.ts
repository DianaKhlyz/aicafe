import { NextResponse } from "next/server";
import { getIikoClient } from "@/lib/iiko";

/**
 * GET /api/menu — меню для клиентских потребителей (мобильное приложение,
 * Telegram-бот). Страницы сайта ходят к getMenu() напрямую через RSC.
 */
export async function GET() {
  const menu = await getIikoClient().getMenu();
  return NextResponse.json(menu, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
