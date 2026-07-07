"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/iiko/types";
import { useCart } from "@/store/cart";

/**
 * Карточка блюда с выбором модификаторов.
 * Обязательные группы (объём и т.п.) предвыбраны первой опцией,
 * необязательные (молоко, сироп) — выключены.
 */
export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const [selected, setSelected] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(
      product.modifierGroups.map((g) => [
        g.id,
        g.required ? g.options[0]?.id ?? null : null,
      ]),
    ),
  );

  const chosenOptions = useMemo(
    () =>
      product.modifierGroups.flatMap((g) => {
        const optionId = selected[g.id];
        const option = g.options.find((o) => o.id === optionId);
        return option ? [option] : [];
      }),
    [product.modifierGroups, selected],
  );

  const unitPrice =
    product.price + chosenOptions.reduce((sum, o) => sum + o.priceDelta, 0);

  const hasModifiers = product.modifierGroups.length > 0;

  function handleAdd() {
    add({
      productId: product.id,
      name: product.name,
      unitPrice,
      optionIds: chosenOptions.map((o) => o.id),
      optionNames: chosenOptions.map((o) => o.name),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="flex flex-col rounded-card border border-line bg-surface p-4 shadow-sm">
      {/* заглушка фото: в фазе 1 заменяется на next/image из iiko/админки */}
      <div className="mb-3 flex h-28 items-center justify-center rounded-card bg-brand-soft text-5xl">
        {product.emoji}
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{product.name}</h3>
        {product.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mb-2 text-sm text-muted">{product.description}</p>
      <p className="mb-3 text-xs text-muted">
        {[product.measure, product.calories && `${product.calories} ккал`]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {hasModifiers && expanded && (
        <div className="mb-3 flex flex-col gap-3">
          {product.modifierGroups.map((group) => (
            <fieldset key={group.id}>
              <legend className="mb-1 text-xs font-semibold text-muted">
                {group.name}
                {group.required ? "" : " (по желанию)"}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {!group.required && (
                  <OptionChip
                    label="Без"
                    active={selected[group.id] === null}
                    onClick={() =>
                      setSelected((s) => ({ ...s, [group.id]: null }))
                    }
                  />
                )}
                {group.options.map((option) => (
                  <OptionChip
                    key={option.id}
                    label={
                      option.priceDelta > 0
                        ? `${option.name} +${option.priceDelta} ₽`
                        : option.name
                    }
                    active={selected[group.id] === option.id}
                    onClick={() =>
                      setSelected((s) => ({ ...s, [group.id]: option.id }))
                    }
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-lg font-bold">{unitPrice} ₽</span>
        <div className="flex gap-2">
          {hasModifiers && (
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? "Свернуть" : "Изменить"}
            </button>
          )}
          <button type="button" className="btn-primary" onClick={handleAdd}>
            {added ? "✓ Добавлено" : "В корзину"}
          </button>
        </div>
      </div>
    </article>
  );
}

function OptionChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-surface text-ink hover:border-brand"
      }`}
    >
      {label}
    </button>
  );
}
