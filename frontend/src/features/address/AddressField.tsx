// Ввод адреса с подсказками (DaData через наш бэк; без ключа — мок).
// Выбор подсказки сразу проверяет попадание в зону доставки — гость видит
// условия (или отказ) до оплаты, а не после.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { components } from "../../api/schema";

export type ZoneCheck = components["schemas"]["AddressCheckResult"];
type Suggestion = components["schemas"]["AddressSuggestion"];

export function AddressField({
  value,
  onChange,
  onZoneCheck,
}: {
  value: string;
  onChange: (address: string) => void;
  onZoneCheck: (result: ZoneCheck | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: suggestions } = useQuery({
    queryKey: ["suggest-address", debounced],
    enabled: open && debounced.trim().length >= 3,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/delivery/suggest", {
        params: { query: { query: debounced } },
      });
      if (error) throw error;
      return data;
    },
  });

  const pick = async (suggestion: Suggestion) => {
    setQuery(suggestion.value);
    onChange(suggestion.value);
    setOpen(false);
    const { data } = await api.POST("/api/delivery/check-address", {
      body: { lat: suggestion.lat, lon: suggestion.lon },
    });
    onZoneCheck(data ?? null);
  };

  return (
    <div className="address-field">
      <input
        type="text"
        placeholder="Улица, дом, квартира"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          onZoneCheck(null); // адрес меняется — прежняя проверка зоны недействительна
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && suggestions && suggestions.length > 0 && (
        <ul className="address-suggestions">
          {suggestions.map((suggestion) => (
            <li key={suggestion.value}>
              <button type="button" onClick={() => pick(suggestion)}>
                {suggestion.value}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
