// Бронь стола: интерактивная карта зала на чистом SVG.
// Рендер читает нейтральную модель «зал -> столы с координатами 0..1»;
// источник координат спрятан за адаптером iiko (план А — схема из iiko,
// план Б — мини-редактор в /admin, см. docs/open-questions.md, риск 3).
// Занятость обновляется живьём: SSE-канал reserves (брони с сайта и
// брони хостес через вебхук ReserveUpdate приходят одинаково).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api } from "../api/client";
import type { components } from "../api/schema";
import { useSSE } from "../shared/useSSE";

type Table = components["schemas"]["Table"];
type Section = components["schemas"]["Section"];
type ReserveView = components["schemas"]["ReserveView"];

const MAP_WIDTH = 100;
const MAP_HEIGHT = 62;

function HallMap({
  section,
  selectedId,
  onSelect,
}: {
  section: Section;
  selectedId: string | null;
  onSelect: (table: Table) => void;
}) {
  return (
    <figure className="hall">
      <figcaption>{section.name}</figcaption>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="listbox"
        aria-label={`Схема: ${section.name}`}
      >
        <rect className="hall-floor" x="1" y="1" width={MAP_WIDTH - 2} height={MAP_HEIGHT - 2} rx="3" />
        {section.tables.map((table) => {
          const cx = table.x * MAP_WIDTH;
          const cy = table.y * MAP_HEIGHT;
          const radius = 5 + Math.min(table.seats, 8);
          const state = table.occupied
            ? "table-spot table-spot--occupied"
            : table.id === selectedId
              ? "table-spot table-spot--selected"
              : "table-spot";
          return (
            <g
              key={table.id}
              className={state}
              role="option"
              aria-selected={table.id === selectedId}
              aria-disabled={table.occupied}
              onClick={() => !table.occupied && onSelect(table)}
            >
              <circle cx={cx} cy={cy} r={radius} />
              <text x={cx} y={cy - 1} textAnchor="middle">
                {table.number}
              </text>
              <text x={cx} y={cy + 3.5} textAnchor="middle" className="table-seats">
                {table.seats} мест
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function BookingPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Table | null>(null);
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [done, setDone] = useState<ReserveView | null>(null);

  const { data: sections, isPending } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/booking/sections");
      if (error) throw error;
      return data;
    },
  });

  // Кто-то забронировал (с сайта или хостес в iiko) — карта обновляется у всех
  const onReserveEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sections"] });
  }, [queryClient]);
  useSSE("reserves", onReserveEvent);

  const reserve = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/api/booking/reserve", {
        body: {
          table_id: selected!.id,
          phone,
          guests,
          time: new Date(time).toISOString(),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (view) => {
      setDone(view);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["sections"] });
    },
  });

  if (isPending) return <p>Загружаем схему залов…</p>;
  if (!sections) return <p>Бронь временно недоступна — позвоните нам.</p>;

  if (done) {
    return (
      <div>
        <h1>Стол забронирован!</h1>
        <p>
          Ждём вас {new Date(done.time).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}.
          Номер брони: {done.id}.
        </p>
        <button className="button-primary" onClick={() => setDone(null)}>
          Забронировать ещё
        </button>
      </div>
    );
  }

  const canSubmit =
    Boolean(selected) && phone.trim().length >= 10 && Boolean(time) && !reserve.isPending;

  return (
    <div className="booking">
      <h1>Бронь стола</h1>
      <p className="form-hint">Выберите свободный стол на схеме — занятые отмечены серым.</p>

      {sections.map((section) => (
        <HallMap
          key={section.id}
          section={section}
          selectedId={selected?.id ?? null}
          onSelect={(table) => {
            setSelected(table);
            setGuests((current) => Math.min(current, table.seats));
          }}
        />
      ))}

      {selected && (
        <div className="reserve-form">
          <h2>
            Стол {selected.number} · до {selected.seats} мест
          </h2>
          <label className="form-field">
            Телефон
            <input
              type="tel"
              placeholder="+7 900 000-00-00"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label className="form-field">
            Гостей
            <select value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
              {Array.from({ length: selected.seats }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Дата и время
            <input
              type="datetime-local"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
          {reserve.isError && (
            <p className="form-error">Не получилось забронировать — попробуйте ещё раз.</p>
          )}
          <button className="button-primary" disabled={!canSubmit} onClick={() => reserve.mutate()}>
            {reserve.isPending ? "Бронируем…" : "Забронировать"}
          </button>
        </div>
      )}
    </div>
  );
}
