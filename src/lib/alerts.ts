import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAlerts, markAlertsRead } from "./alerts.functions";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

/** Alerts for the signed-in user; null when signed out. Refreshes every minute. */
export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const headers = await authHeaders();
      return headers ? getAlerts({ headers }) : null;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
}

export function useMarkAlertsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (keys: string[]) => {
      const headers = await authHeaders();
      if (!headers) return { marked: 0 };
      return markAlertsRead({ data: { keys }, headers });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}
