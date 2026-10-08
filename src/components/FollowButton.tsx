import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

type Props = { type: "club" | "team" | "player"; id: string };

const BASE =
  "inline-flex items-center gap-2 rounded border px-3 py-1 font-display tracking-wide transition-colors";

/** Follow/unfollow toggle for the hero of a player or club page. */
export function FollowButton({ type, id }: Props) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const key = ["follow", type, id];

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { userId: null, followId: null as string | null };
      const { data: row } = await supabase
        .from("follows")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("target_type", type)
        .eq("target_id", id)
        .maybeSingle();
      return { userId: auth.user.id, followId: row?.id ?? null };
    },
    staleTime: 30_000,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!data?.userId) return;
      if (data.followId) {
        const { error } = await supabase.from("follows").delete().eq("id", data.followId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ user_id: data.userId, target_type: type, target_id: id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  if (!data) return null;

  if (!data.userId) {
    return (
      <Link
        to="/auth"
        className={`${BASE} border-pitch-foreground/40 hover:bg-pitch-foreground/10`}
        title={t("follow.signIn")}
      >
        <Bell className="size-4" aria-hidden="true" />
        {t("follow.follow")}
      </Link>
    );
  }

  const following = data.followId != null;
  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      aria-pressed={following}
      className={`${BASE} ${
        following
          ? "border-accent bg-accent text-accent-foreground hover:opacity-90"
          : "border-pitch-foreground/40 hover:bg-pitch-foreground/10"
      }`}
    >
      {following ? <BellRing className="size-4" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
      {following ? t("follow.following") : t("follow.follow")}
    </button>
  );
}
