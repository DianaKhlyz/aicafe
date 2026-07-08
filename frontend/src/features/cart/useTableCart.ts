// Общая корзина стола: одна на всех гостей, вошедших по QR.
// Мутации уходят на сервер, изменения других гостей приходят по SSE.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "../../api/client";
import { useSSE } from "../../shared/useSSE";

export function useTableCart(tableCode: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["table-cart", tableCode];

  const { data: cart } = useQuery({
    queryKey,
    enabled: Boolean(tableCode),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/tables/{table_code}/cart", {
        params: { path: { table_code: tableCode! } },
      });
      if (error) throw error;
      return data;
    },
  });

  // Другой гость изменил корзину — обновляемся
  const onCartEvent = useCallback(
    (data: unknown) => {
      if ((data as { table_code?: string }).table_code === tableCode) {
        queryClient.invalidateQueries({ queryKey: ["table-cart", tableCode] });
      }
    },
    [tableCode, queryClient],
  );
  useSSE("table-cart", onCartEvent);

  const update = useMutation({
    mutationFn: async (change: { item_id: string; quantity: number; guest: string }) => {
      const { data, error } = await api.POST("/api/tables/{table_code}/cart", {
        params: { path: { table_code: tableCode! } },
        body: change,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (fresh) => queryClient.setQueryData(queryKey, fresh),
  });

  return { cart, update };
}
