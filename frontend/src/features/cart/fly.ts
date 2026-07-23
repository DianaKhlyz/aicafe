// Анимация «полёта» в корзину: точка летит от кнопки к якорю корзины в шапке.
export function flyToCart(source: HTMLElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = document.getElementById("cart-anchor");
  if (!target) return;
  const s = source.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const dot = document.createElement("div");
  dot.className = "fc-fly";
  dot.style.left = `${s.left + s.width / 2 - 7}px`;
  dot.style.top = `${s.top + s.height / 2 - 7}px`;
  document.body.appendChild(dot);
  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);
  dot
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 50}px) scale(1.1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 },
      ],
      { duration: 600, easing: "cubic-bezier(0.5, 0, 0.4, 1)" },
    )
    .addEventListener("finish", () => dot.remove());
}
