import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdultGate } from "@/components/AdultGate";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDateInLang, useLanguage } from "@/lib/i18n";
import {
  useBlock,
  useConversations,
  useMarkRead,
  useMessagingProfile,
  useReportMessage,
  useSendMessage,
  useThread,
  type ConversationSummary,
} from "@/lib/messages";

type Search = { c?: string };

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — TransferWire" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["c"] === "string" && search["c"] ? { c: search["c"] } : {},
  component: MessagesPage,
});

function MessagesPage() {
  const { t } = useLanguage();
  const { c } = Route.useSearch();
  const { data: me, isLoading } = useMessagingProfile();
  const { data: conversations = [] } = useConversations();
  const active = conversations.find((conversation) => conversation.id === c);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl">{t("messages.title")}</h1>
        {isLoading ? null : !me?.profile ? (
          <div className="mt-6 max-w-md rounded-lg border border-border bg-card p-6 shadow-card">
            <AdultGate />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-[18rem_1fr]">
            <ConversationList conversations={conversations} activeId={c} hideOnMobile={!!active} />
            <section className={active ? "" : "hidden md:block"}>
              {active ? (
                <Thread key={active.id} conversation={active} myId={me.userId!} />
              ) : (
                <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
                  {conversations.length === 0 ? t("messages.empty") : t("messages.pick")}
                </p>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ConversationList({
  conversations,
  activeId,
  hideOnMobile,
}: {
  conversations: ConversationSummary[];
  activeId: string | undefined;
  hideOnMobile: boolean;
}) {
  return (
    <ul className={`grid content-start gap-2 ${hideOnMobile ? "hidden md:grid" : ""}`}>
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            to="/messages"
            search={{ c: conversation.id }}
            className={`block rounded-lg border bg-card p-3 shadow-card transition-colors hover:bg-muted ${
              conversation.id === activeId ? "border-accent" : "border-border"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-display text-lg leading-tight">{conversation.otherName}</span>
              {conversation.unread > 0 ? (
                <span className="rounded-full bg-accent px-2 text-xs font-medium leading-5 text-accent-foreground">
                  {conversation.unread}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">{conversation.lastBody}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Thread({ conversation, myId }: { conversation: ConversationSummary; myId: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: messages = [] } = useThread(conversation.id);
  const send = useSendMessage(conversation.id);
  const markRead = useMarkRead();
  const block = useBlock();
  const report = useReportMessage();
  const [body, setBody] = useState("");
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const newest = messages[messages.length - 1]?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    if (conversation.unread > 0) markRead.mutate(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    send.mutate(body, {
      onSuccess: () => setBody(""),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="flex h-[70vh] min-h-96 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          className="text-sm text-primary underline md:hidden"
          onClick={() => void navigate({ to: "/messages", search: {} })}
        >
          {t("messages.back")}
        </button>
        <p className="min-w-0 flex-1 truncate font-display text-xl">{conversation.otherName}</p>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => block.mutate({ userId: conversation.otherId, block: !conversation.blockedByMe })}
        >
          {conversation.blockedByMe ? t("messages.unblock") : t("messages.block")}
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const mine = message.sender_id === myId;
          return (
            <div key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {message.body}
              </p>
              <span className="mt-0.5 flex gap-2 text-[0.7rem] text-muted-foreground">
                {formatDateInLang(message.created_at.slice(0, 10), "")}
                {!mine ? (
                  <button type="button" className="underline" onClick={() => setReporting(message.id)}>
                    {t("messages.report")}
                  </button>
                ) : null}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {conversation.blockedByMe ? (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{t("messages.blockedNote")}</p>
      ) : (
        <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(event);
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={t("messages.reply")}
            className="min-h-0 flex-1 resize-none"
          />
          <Button type="submit" disabled={send.isPending || !body.trim()}>
            {t("messages.send")}
          </Button>
        </form>
      )}

      <Dialog open={reporting !== null} onOpenChange={(open) => !open && setReporting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("messages.reportTitle")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder={t("messages.reportWhy")}
          />
          <Button
            disabled={report.isPending || reason.trim().length < 3}
            onClick={() =>
              report.mutate(
                { messageId: reporting!, reason },
                {
                  onSuccess: () => {
                    toast.success(t("messages.reportSent"));
                    setReporting(null);
                    setReason("");
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            {t("messages.report")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
