"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Edit,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LetterExampleRow, LetterConfig } from "./page";
import { ExampleForm } from "@/components/letter-templates/example-form";

interface LetterTemplatesClientProps {
  data: LetterExampleRow[];
  config: LetterConfig;
}

export function LetterTemplatesClient({
  data,
  config,
}: LetterTemplatesClientProps) {
  const t = useTranslations("letterTemplates");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // --- Example letters state ---
  const [formOpen, setFormOpen] = React.useState(false);
  const [formExample, setFormExample] = React.useState<
    LetterExampleRow | undefined
  >(undefined);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<LetterExampleRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // --- View / edit extracted text state ---
  const [textDialogOpen, setTextDialogOpen] = React.useState(false);
  const [textTarget, setTextTarget] = React.useState<LetterExampleRow | null>(
    null
  );
  const [editedText, setEditedText] = React.useState("");
  const [savingText, setSavingText] = React.useState(false);

  // --- Generation settings state ---
  const [systemPrompt, setSystemPrompt] = React.useState(config.systemPrompt);
  const [tone, setTone] = React.useState<"formal" | "semi-formal">(
    config.tone
  );
  const [maxWords, setMaxWords] = React.useState(config.maxWords);
  const [savingConfig, setSavingConfig] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  // --- Example CRUD handlers ---
  function handleAddExample() {
    setFormExample(undefined);
    setFormOpen(true);
  }

  function handleEditExample(example: LetterExampleRow) {
    setFormExample(example);
    setFormOpen(true);
  }

  function handleDeleteExample(example: LetterExampleRow) {
    setDeleteTarget(example);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      // Delete the PDF from storage first
      if (deleteTarget.file_path) {
        await supabase.storage
          .from("letter-intent-examples")
          .remove([deleteTarget.file_path]);
      }

      const { error } = await supabase
        .from("letter_intent_examples")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast.success(t("deleteSuccess"));
      router.refresh();
    } catch (err) {
      console.error("Error deleting example:", err);
      toast.error(tCommon("delete") + " error");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  }

  async function handleToggleActive(example: LetterExampleRow) {
    const newActive = !example.is_active;

    const { error } = await supabase
      .from("letter_intent_examples")
      .update({ is_active: newActive })
      .eq("id", example.id);

    if (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update status");
    } else {
      router.refresh();
    }
  }

  // --- View / edit extracted text ---
  function handleViewText(example: LetterExampleRow) {
    setTextTarget(example);
    setEditedText(example.extracted_text ?? "");
    setTextDialogOpen(true);
  }

  async function handleSaveText() {
    if (!textTarget) return;
    setSavingText(true);

    try {
      const { error } = await supabase
        .from("letter_intent_examples")
        .update({ extracted_text: editedText })
        .eq("id", textTarget.id);

      if (error) throw error;

      toast.success(t("saveSuccess"));
      setTextDialogOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error saving extracted text:", err);
      toast.error(tCommon("save") + " error");
    } finally {
      setSavingText(false);
    }
  }

  // --- Generation settings ---
  async function handleSaveConfig() {
    setSavingConfig(true);

    try {
      const configValue: LetterConfig = {
        systemPrompt,
        tone,
        maxWords,
      };

      const { error } = await supabase
        .from("settings")
        .upsert(
          { key: "letter_intent_config", value: configValue as unknown as Record<string, unknown> },
          { onConflict: "key" }
        );

      if (error) throw error;

      toast.success(t("saveSuccess"));
    } catch (err) {
      console.error("Error saving config:", err);
      toast.error(tCommon("save") + " error");
    } finally {
      setSavingConfig(false);
    }
  }

  function handleFormSuccess() {
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* ========== Section 1: Example Letters ========== */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("description")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
            >
              <RefreshCw className="mr-1 size-4" />
              {tCommon("refresh")}
            </Button>
            <Button variant="default" size="sm" onClick={handleAddExample}>
              <Plus className="mr-1 size-4" />
              {t("addExample")}
            </Button>
          </div>
        </div>

        {/* Sub-heading */}
        <h2 className="text-lg font-semibold">{t("examples")}</h2>

        {/* Card grid */}
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
            <FileText className="text-muted-foreground mb-4 size-12" />
            <p className="text-muted-foreground text-lg font-medium">
              {t("noExamples")}
            </p>
            <Button
              variant="default"
              size="sm"
              className="mt-4"
              onClick={handleAddExample}
            >
              <Plus className="mr-1 size-4" />
              {t("addExample")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((example) => (
              <Card
                key={example.id}
                className={!example.is_active ? "opacity-60" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {example.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      {example.country && (
                        <Badge variant="default">{example.country}</Badge>
                      )}
                      {example.visa_type && (
                        <Badge variant="secondary">
                          {example.visa_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {example.extracted_text ? (
                    <p className="text-muted-foreground line-clamp-4 text-sm">
                      {example.extracted_text.slice(0, 150)}
                      {example.extracted_text.length > 150 ? "..." : ""}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      {t("extractedText")}: --
                    </p>
                  )}
                </CardContent>

                <CardFooter className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={example.is_active}
                      onCheckedChange={() => handleToggleActive(example)}
                      size="sm"
                    />
                    <span className="text-muted-foreground text-xs">
                      {example.is_active
                        ? tCommon("active")
                        : tCommon("passive")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleViewText(example)}
                      title={t("viewText")}
                    >
                      <FileText className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleEditExample(example)}
                      title={tCommon("edit")}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteExample(example)}
                      title={tCommon("delete")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ========== Section 2: Generation Settings ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            {t("settings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">{t("systemPrompt")}</Label>
            <Textarea
              id="systemPrompt"
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="tone">{t("tone")}</Label>
              <Select
                value={tone}
                onValueChange={(v) =>
                  setTone(v as "formal" | "semi-formal")
                }
              >
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">{t("formal")}</SelectItem>
                  <SelectItem value="semi-formal">
                    {t("semiFormal")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Words */}
            <div className="space-y-2">
              <Label htmlFor="maxWords">{t("maxWords")}</Label>
              <Input
                id="maxWords"
                type="number"
                min={100}
                max={5000}
                value={maxWords}
                onChange={(e) =>
                  setMaxWords(parseInt(e.target.value, 10) || 500)
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveConfig} disabled={savingConfig}>
            {savingConfig ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {tCommon("save")}
          </Button>
        </CardFooter>
      </Card>

      {/* ========== Example Form Dialog ========== */}
      <ExampleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        example={formExample}
        onSuccess={handleFormSuccess}
      />

      {/* ========== Delete Confirm Dialog ========== */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteExample")}</DialogTitle>
            <DialogDescription>
              {t("deleteExample")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== View / Edit Extracted Text Dialog ========== */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editText")}</DialogTitle>
            <DialogDescription>
              {textTarget?.name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={12}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTextDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSaveText} disabled={savingText}>
              {savingText && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
