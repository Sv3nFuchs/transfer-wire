import { Link, useNavigate } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdultGate } from "@/components/AdultGate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { useCanMessage, useMessagingProfile, useStartConversation } from "@/lib/messages";

type Props = {
  /** The adult account that owns the profile or club page. */
  ownerId: string | null | undefined;
  subjectType: "player" | "club";
  subjectId: string;
};

const BTN =
  "inline-flex items-center gap-2 rounded border border-pitch-foreground/40 px-3 py-1 font-display tracking-wide transition-colors hover:bg-pitch-foreground/10";

/** "Message" button on player and club pages. Messages go to the adult who owns the page. */
export function MessageButton({ ownerId, subjectType, subjectId }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const { data: me } = useMessagingProfile();
  const { data: canMessage } = useCanMessage(ownerId);
  const start = useStartConversation();

  if (!ownerId || !me) return null;
  if (me.userId === ownerId) return null;
  if (!canMessage) return null;

  if (!me.userId) {
    return (
      <Link to="/auth" className={BTN} title={t("messages.logInToMessage")}>
        <MessageSquare className="size-4" aria-hidden="true" />
        {t("messages.message")}
      </Link>
    );
  }

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    start.mutate(
      { recipientId: ownerId, subjectType, subjectId, body },
      {
        onSuccess: (conversationId) => {
          setOpen(false);
          setBody("");
          void navigate({ to: "/messages", search: { c: conversationId } });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <>
      <button type="button" className={BTN} onClick={() => setOpen(true)}>
        <MessageSquare className="size-4" aria-hidden="true" />
        {t("messages.message")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("messages.newMessage")}</DialogTitle>
            <DialogDescription>{t("messages.goesToOwner")}</DialogDescription>
          </DialogHeader>
          {me.profile ? (
            <form onSubmit={send} className="space-y-3">
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                rows={5}
                required
                placeholder={t("messages.writePlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("messages.safetyNote")}</p>
              <Button type="submit" disabled={start.isPending || body.trim().length === 0}>
                {t("messages.send")}
              </Button>
            </form>
          ) : (
            <AdultGate />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
