"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getApplicationNotes,
  addApplicationNote,
  updateApplicationNote,
  deleteApplicationNote,
} from "@/app/[locale]/(portal)/portal/actions";

interface NotesTabProps {
  applicationId: number | null;
}

export function NotesTab({ applicationId }: NotesTabProps) {
  const t = useTranslations("applications");

  const [noteId, setNoteId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNote = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const notes = await getApplicationNotes(applicationId);
      if (notes.length > 0) {
        setNoteId(notes[0].id);
        setContent(notes[0].content);
        setSavedContent(notes[0].content);
      } else {
        setNoteId(null);
        setContent("");
        setSavedContent("");
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const saveNote = useCallback(
    async (text: string) => {
      if (!applicationId || text.trim() === savedContent.trim()) return;
      if (!text.trim()) return; // Don't save empty — use delete instead

      setSaving(true);
      try {
        if (noteId) {
          // Update existing note
          const result = await updateApplicationNote(noteId, text.trim());
          if (result.error) {
            toast.error(t("saveError"));
            return;
          }
        } else {
          // Create new note
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const result = await addApplicationNote({
            applicationId,
            content: text.trim(),
            category: "internal",
            authorId: user.id,
          });
          if (result.error) {
            toast.error(t("saveError"));
            return;
          }
          if (result.note) {
            setNoteId(result.note.id);
          }
        }
        setSavedContent(text.trim());
        toast.success(t("noteSaved"));
      } catch {
        toast.error(t("saveError"));
      } finally {
        setSaving(false);
      }
    },
    [applicationId, noteId, savedContent, t]
  );

  const handleBlur = () => {
    // Debounced save on blur
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(content);
    }, 300);
  };

  const handleDelete = async () => {
    if (!noteId) return;

    setSaving(true);
    try {
      const result = await deleteApplicationNote(noteId);
      if (result.error) {
        toast.error(t("deleteError"));
        return;
      }
      setNoteId(null);
      setContent("");
      setSavedContent("");
      toast.success(t("noteDeleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setSaving(false);
    }
  };

  if (!applicationId) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t("noNotes")}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder={t("notePlaceholder")}
        className="min-h-[100px] resize-y text-sm"
        rows={4}
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {saving && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("noteSaving")}
            </span>
          )}
        </div>
        {noteId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={saving}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 h-7 px-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
