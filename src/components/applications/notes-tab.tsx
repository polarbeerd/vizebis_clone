"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Pin,
  PinOff,
  Send,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getApplicationNotes,
  addApplicationNote,
  toggleNotePin,
} from "@/app/[locale]/(portal)/portal/actions";
import type { ApplicationNote } from "@/app/[locale]/(portal)/portal/actions";

interface NotesTabProps {
  applicationId: number | null;
}

export function NotesTab({ applicationId }: NotesTabProps) {
  const t = useTranslations("applications");

  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("internal");

  const fetchNotes = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const data = await getApplicationNotes(applicationId);
      setNotes(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSend = async () => {
    if (!applicationId || !content.trim()) return;
    setSending(true);
    try {
      // Get current user
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const result = await addApplicationNote({
        applicationId,
        content: content.trim(),
        category,
        authorId: user.id,
      });

      if (result.error) {
        toast.error(t("addNote"));
        return;
      }

      toast.success(t("noteAdded"));
      setContent("");
      await fetchNotes();
    } catch {
      toast.error(t("addNote"));
    } finally {
      setSending(false);
    }
  };

  const handleTogglePin = async (note: ApplicationNote) => {
    const result = await toggleNotePin(note.id, !note.is_pinned);
    if (result.error) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n
      )
    );
  };

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      internal: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      client_followup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      consulate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
    const labels: Record<string, string> = {
      internal: t("noteCategoryInternal"),
      client_followup: t("noteCategoryFollowup"),
      consulate: t("noteCategoryConsulate"),
    };
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[cat] ?? colors.internal}`}
      >
        {labels[cat] ?? cat}
      </span>
    );
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (!applicationId) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t("noNotes")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Notes list */}
      <div className="max-h-[300px] overflow-y-auto space-y-2">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm">{t("noNotes")}</p>
          </div>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className={`rounded-lg border p-3 text-sm ${
              note.is_pinned
                ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20"
                : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-foreground whitespace-pre-wrap">
                {note.content}
              </p>
              <button
                onClick={() => handleTogglePin(note)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                title={note.is_pinned ? t("unpinNote") : t("pinNote")}
              >
                {note.is_pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              {note.author_name && (
                <span className="font-medium">{note.author_name}</span>
              )}
              {categoryBadge(note.category)}
              <span>{timeAgo(note.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick-add */}
      <div className="flex items-center gap-2 border-t pt-3">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("notePlaceholder")}
          className="flex-1 h-9"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">{t("noteCategoryInternal")}</SelectItem>
            <SelectItem value="client_followup">{t("noteCategoryFollowup")}</SelectItem>
            <SelectItem value="consulate">{t("noteCategoryConsulate")}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="h-9"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
