// Авторизация по телефону: мягкая, гостевой чекаут никуда не девается.
// Сессия — HttpOnly-cookie, состояние берём из GET /api/auth/me.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: me, isPending } = useQuery({
    queryKey: ["me"],
    retry: false,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/auth/me");
      if (response.status === 401) return null;
      return data ?? null;
    },
  });

  const requestCode = useMutation({
    mutationFn: async (phone: string) => {
      const { error } = await api.POST("/api/auth/request-code", { body: { phone } });
      if (error) throw error;
    },
  });

  const verify = useMutation({
    mutationFn: async (body: { phone: string; code: string }) => {
      const { data, error } = await api.POST("/api/auth/verify", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const logout = useMutation({
    mutationFn: async () => {
      await api.POST("/api/auth/logout");
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return { me: me ?? null, isPending, requestCode, verify, logout };
}

export function useOrderHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["account-orders"],
    enabled,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/account/orders");
      if (error) throw error;
      return data;
    },
  });
}
