// Амбиент поднимающихся пузырьков (пиво) в герое — тёплый, деликатный,
// на canvas. Пауза, когда вкладка скрыта; уважает reduce-motion.
import { useEffect, useRef } from "react";

export function HeroBubbles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const host = canvas.parentElement;
    if (!ctx || !host) return;

    let w = 0;
    let h = 0;
    let bubbles: { x: number; y: number; r: number; s: number; o: number }[] = [];
    let raf = 0;

    const size = () => {
      w = canvas.width = host.offsetWidth;
      h = canvas.height = host.offsetHeight;
    };
    const seed = () => {
      bubbles = Array.from({ length: 22 }, () => ({
        x: Math.random() * w,
        y: h + Math.random() * h,
        r: 1.5 + Math.random() * 4,
        s: 0.25 + Math.random() * 0.6,
        o: 0.08 + Math.random() * 0.18,
      }));
    };
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const b of bubbles) {
        b.y -= b.s;
        b.x += Math.sin(b.y / 40) * 0.25;
        if (b.y + b.r < 0) {
          b.y = h + b.r;
          b.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 103, 61, ${b.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    size();
    seed();
    frame();
    const onResize = () => {
      cancelAnimationFrame(raf);
      size();
      seed();
      frame();
    };
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else frame();
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="hero-bubbles" aria-hidden="true" />;
}
