import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** The signed-in user's messaging profile (exists only after confirming they are 18+). */
export function useMessagingProfile() {
  return useQuery({
    queryKey: ["messaging-profile"],
    queryFn: async () => {
      const userId = await currentUserId();
      if (!userId) return { userId: null, profile: null };
      const { data, error } = await supabase
        .from("messaging_profiles")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { userId, profile: data };
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useEnableMessaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("Log in first");
      const { error } = await supabase
        .from("messaging_profiles")
        .insert({ user_id: userId, display_name: displayName.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messaging-profile"] }),
  });
}

export function useUnreadMessages(enabled: boolean) {
  return useQuery({
    queryKey: ["unread-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("unread_message_count");
      if (error) throw new Error(error.message);
      return data ?? 0;
    },
    enabled,
    refetchInterval: 30_000,
    retry: false,
  });
}

export type ConversationSummary = {
  id: string;
  otherId: string;
  otherName: string;
  lastBody: string;
  lastAt: string;
  unread: number;
  blockedByMe: boolean;
};

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const me = await currentUserId();
      if (!me) return [];
      const { data: mine, error } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", me);
      if (error) throw new Error(error.message);
      const ids = (mine ?? []).map((m) => m.conversation_id);
      if (ids.length === 0) return [];

      const [others, messages, blocks] = await Promise.all([
        supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids).neq("user_id", me),
        supabase
          .from("messages")
          .select("conversation_id, sender_id, body, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(400),
        supabase.from("user_blocks").select("blocked_id").eq("blocker_id", me),
      ]);
      for (const r of [others, messages, blocks]) if (r.error) throw new Error(r.error.message);

      const otherIds = [...new Set((others.data ?? []).map((o) => o.user_id))];
      const names = otherIds.length
        ? await supabase.from("messaging_profiles").select("user_id, display_name").in("user_id", otherIds)
        : { data: [], error: null };
      if (names.error) throw new Error(names.error.message);
      const nameOf = new Map((names.data ?? []).map((n) => [n.user_id, n.display_name]));
      const blocked = new Set((blocks.data ?? []).map((b) => b.blocked_id));

      const summaries: ConversationSummary[] = [];
      for (const m of mine ?? []) {
        const other = (others.data ?? []).find((o) => o.conversation_id === m.conversation_id);
        const inConv = (messages.data ?? []).filter((x) => x.conversation_id === m.conversation_id);
        const last = inConv[0];
        if (!other || !last) continue;
        summaries.push({
          id: m.conversation_id,
          otherId: other.user_id,
          otherName: nameOf.get(other.user_id) ?? "Member",
          lastBody: last.body,
          lastAt: last.created_at,
          unread: inConv.filter((x) => x.sender_id !== me && x.created_at > m.last_read_at).length,
          blockedByMe: blocked.has(other.user_id),
        });
      }
      return summaries.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    },
    refetchInterval: 15_000,
    retry: false,
  });
}

export type ThreadMessage = { id: string; sender_id: string; body: string; created_at: string };

export function useThread(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["thread", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ThreadMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    refetchInterval: 8_000,
    retry: false,
  });
}

function useRefreshMessages() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    void queryClient.invalidateQueries({ queryKey: ["thread"] });
    void queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
  };
}

export function useSendMessage(conversationId: string) {
  const refresh = useRefreshMessages();
  return useMutation({
    mutationFn: async (body: string) => {
      const me = await currentUserId();
      if (!me) throw new Error("Log in first");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: me, body: body.trim() });
      if (error) throw new Error("This message could not be sent. You may have been blocked.");
    },
    onSuccess: refresh,
  });
}

export function useMarkRead() {
  const refresh = useRefreshMessages();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const me = await currentUserId();
      if (!me) return;
      await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", me);
    },
    onSuccess: refresh,
  });
}

export function useStartConversation() {
  const refresh = useRefreshMessages();
  return useMutation({
    mutationFn: async (input: { recipientId: string; subjectType: "player" | "club"; subjectId: string; body: string }) => {
      const { data, error } = await supabase.rpc("start_conversation", {
        _recipient: input.recipientId,
        _subject_type: input.subjectType,
        _subject_id: input.subjectId,
        _body: input.body,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: refresh,
  });
}

export function useBlock() {
  const refresh = useRefreshMessages();
  return useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const me = await currentUserId();
      if (!me) throw new Error("Log in first");
      const query = block
        ? supabase.from("user_blocks").insert({ blocker_id: me, blocked_id: userId })
        : supabase.from("user_blocks").delete().eq("blocker_id", me).eq("blocked_id", userId);
      const { error } = await query;
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });
}

export function useReportMessage() {
  return useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason: string }) => {
      const { error } = await supabase.rpc("report_message", { _message: messageId, _reason: reason });
      if (error) throw new Error(error.message);
    },
  });
}

/** Whether this account owner has turned messages on (decides if a Message button shows). */
export function useCanMessage(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["can-message", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("can_message", { _user: userId! });
      if (error) return false;
      return data === true;
    },
    staleTime: 60_000,
    retry: false,
  });
}
