import type { Metadata } from "next";
import { getIikoClient } from "@/lib/iiko";
import { ProductCard } from "@/components/menu/ProductCard";

export const metadata: Metadata = { title: "Меню" };

/** ISR: меню отдаётся из кэша, iiko опрашивается не чаще раза в 5 минут */
export const revalidate = 300;

export default async function MenuPage() {
  const menu = await getIikoClient().getMenu();
  const categories = [...menu.categories].sort((a, b) => a.sort - b.sort);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Меню</h1>

      {/* якорная навигация по категориям */}
      <nav className="sticky top-16 z-10 -mx-4 mb-8 flex gap-2 overflow-x-auto border-b border-line bg-cream/95 px-4 py-3 backdrop-blur md:top-16">
        {categories.map((category) => (
          <a
            key={category.id}
            href={`#${category.id}`}
            className="whitespace-nowrap rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
          >
            {category.name}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-12">
        {categories.map((category) => {
          const products = menu.products.filter(
            (p) => p.categoryId === category.id && !p.stopped,
          );
          if (products.length === 0) return null;
          return (
            <section key={category.id} id={category.id} className="scroll-mt-32">
              <h2 className="mb-1 text-2xl font-bold">{category.name}</h2>
              {category.description && (
                <p className="mb-4 text-sm text-muted">{category.description}</p>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
