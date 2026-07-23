// Следящая корзина: пилюля внизу экрана (появляется, когда есть позиции)
// открывает шторку с редактированием. Работает для доставки/самовывоза
// (локальная корзина); за столом действует общая корзина стола на своей
// странице. Не занимает место в раскладке — меню на всю ширину.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "./store";
import { phClass } from "./ph";

const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
function plural(n: number, f: [string, string, string]) {
  const m = n % 100;
  const d = n % 10;
  return f[m > 4 && m < 21 ? 2 : d === 1 ? 0 : d > 1 && d < 5 ? 1 : 2];
}

export function FloatingCart() {
  const navigate = useNavigate();
  const { lines, mode, setQuantity, total } = useCart();
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const prevCount = useRef(0);

  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const sum = total();
  // За столом корзина общая и живёт на своей странице
  const visible = mode !== "table" && count > 0;

  // Подпрыгивание пилюли при добавлении
  useEffect(() => {
    if (count > prevCount.current && pillRef.current) {
      const p = pillRef.current;
      p.classList.remove("bump");
      void p.offsetWidth;
      p.classList.add("bump");
    }
    prevCount.current = count;
  }, [count]);

  useEffect(() => {
    if (count === 0) setOpen(false);
  }, [count]);

  return (
    <>
      <button ref={pillRef} className={visible ? "fc-pill show" : "fc-pill"} onClick={() => setOpen(true)}>
        <span className="fc-left">
          <span className="fc-badge tnum">{count} {plural(count, ["позиция", "позиции", "позиций"])}</span>
          <span className="tnum">{fmt(sum)}</span>
        </span>
        <span className="fc-open">Корзина →</span>
      </button>

      <div className={open ? "fc-overlay open" : "fc-overlay"} onClick={() => setOpen(false)} />
      <aside className={open ? "fc-sheet open" : "fc-sheet"} aria-hidden={!open}>
        <div className="fc-head">
          <h3>Ваш заказ</h3>
          <button onClick={() => setOpen(false)} aria-label="Закрыть">×</button>
        </div>
        <div className="fc-body">
          {lines.length === 0 ? (
            <div className="fc-empty">Корзина пуста.<br />Выберите что-нибудь к пиву.</div>
          ) : (
            lines.map((line) => (
              <div key={line.itemId} className="fc-line">
                <span className="thumb">
                  <span className={`ph ${phClass(line.itemId)}`} />
                </span>
                <div>
                  <div className="n">{line.name}</div>
                  <div className="pr tnum">{fmt(line.price)}</div>
                </div>
                <div className="stepper">
                  <button onClick={() => setQuantity(line.itemId, line.quantity - 1)} aria-label="Меньше">−</button>
                  <span className="tnum">{line.quantity}</span>
                  <button onClick={() => setQuantity(line.itemId, line.quantity + 1)} aria-label="Больше">+</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="fc-foot">
          <div className="fc-totals">
            <span className="form-hint">Итого</span>
            <span className="s tnum">{fmt(sum)}</span>
          </div>
          <button
            className="button-primary"
            disabled={lines.length === 0}
            onClick={() => {
              setOpen(false);
              navigate("/checkout");
            }}
          >
            Оформить заказ
          </button>
        </div>
      </aside>
    </>
  );
}
