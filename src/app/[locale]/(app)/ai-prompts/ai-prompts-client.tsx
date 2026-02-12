"use client";

import * as React from "react";
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Info,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Prompt {
  id: string;
  name: string;
  prompt_text: string;
  variables: string[];
  is_active: boolean;
}

interface AiPromptsClientProps {
  translations: {
    title: string;
    subtitle: string;
    addNew: string;
    editPrompt: string;
    addDescription: string;
    editDescription: string;
    searchPlaceholder: string;
    name: string;
    promptText: string;
    promptTextPlaceholder: string;
    variables: string;
    isActive: string;
    inactive: string;
    noPrompts: string;
    createSuccess: string;
    updateSuccess: string;
    saveError: string;
    deleteSuccess: string;
    deleteError: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
    templateVariables: string;
    templateVariablesDescription: string;
    varFullName: string;
    varCountry: string;
    varCity: string;
    varDate: string;
    varCompany: string;
    varPassportNo: string;
    varPosition: string;
    varVisitReason: string;
    varDepartureDate: string;
    varReturnDate: string;
    autoDetected: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    actions: string;
    status: string;
  };
}

// Sample data for demonstration
const INITIAL_PROMPTS: Prompt[] = [
  {
    id: "1",
    name: "Vize Destek Mektubu",
    prompt_text:
      "{{ad_soyad}} adlı kişi için {{ulke}} vizesi destek mektubu oluştur. Pasaport No: {{pasaport_no}}, Tarih: {{tarih}}",
    variables: ["ad_soyad", "ulke", "pasaport_no", "tarih"],
    is_active: true,
  },
  {
    id: "2",
    name: "Ticari Ziyaret Mektubu",
    prompt_text:
      "{{firma}} bünyesinde {{pozisyon}} olarak çalışan {{ad_soyad}} için {{ulke}} ticari ziyaret mektubu hazırla. Gidiş: {{gidis_tarihi}}, Dönüş: {{donus_tarihi}}",
    variables: [
      "firma",
      "pozisyon",
      "ad_soyad",
      "ulke",
      "gidis_tarihi",
      "donus_tarihi",
    ],
    is_active: true,
  },
  {
    id: "3",
    name: "Aile Ziyareti",
    prompt_text:
      "{{ad_soyad}}, {{sehir}} / {{ulke}} adresindeki ailesini ziyaret etmek istemektedir. Ziyaret sebebi: {{ziyaret_sebebi}}",
    variables: ["ad_soyad", "sehir", "ulke", "ziyaret_sebebi"],
    is_active: false,
  },
];

const TEMPLATE_VARIABLES = [
  { name: "{{ad_soyad}}", descriptionKey: "varFullName" as const },
  { name: "{{ulke}}", descriptionKey: "varCountry" as const },
  { name: "{{sehir}}", descriptionKey: "varCity" as const },
  { name: "{{tarih}}", descriptionKey: "varDate" as const },
  { name: "{{firma}}", descriptionKey: "varCompany" as const },
  { name: "{{pasaport_no}}", descriptionKey: "varPassportNo" as const },
  { name: "{{pozisyon}}", descriptionKey: "varPosition" as const },
  { name: "{{ziyaret_sebebi}}", descriptionKey: "varVisitReason" as const },
  { name: "{{gidis_tarihi}}", descriptionKey: "varDepartureDate" as const },
  { name: "{{donus_tarihi}}", descriptionKey: "varReturnDate" as const },
];

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

export function AiPromptsClient({ translations: t }: AiPromptsClientProps) {
  const [prompts, setPrompts] = React.useState<Prompt[]>(INITIAL_PROMPTS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingPrompt, setEditingPrompt] = React.useState<Prompt | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Prompt | null>(null);

  // Form state
  const [formName, setFormName] = React.useState("");
  const [formText, setFormText] = React.useState("");
  const [formActive, setFormActive] = React.useState(true);
  const detectedVars = React.useMemo(() => extractVariables(formText), [formText]);

  const filteredPrompts = React.useMemo(() => {
    if (!searchQuery) return prompts;
    const q = searchQuery.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.prompt_text.toLowerCase().includes(q)
    );
  }, [prompts, searchQuery]);

  function openNewForm() {
    setEditingPrompt(null);
    setFormName("");
    setFormText("");
    setFormActive(true);
    setFormOpen(true);
  }

  function openEditForm(prompt: Prompt) {
    setEditingPrompt(prompt);
    setFormName(prompt.name);
    setFormText(prompt.prompt_text);
    setFormActive(prompt.is_active);
    setFormOpen(true);
  }

  function handleSave() {
    if (!formName.trim() || !formText.trim()) return;

    if (editingPrompt) {
      // Update existing
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === editingPrompt.id
            ? {
                ...p,
                name: formName,
                prompt_text: formText,
                variables: detectedVars,
                is_active: formActive,
              }
            : p
        )
      );
      toast.success(t.updateSuccess);
    } else {
      // Create new
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        name: formName,
        prompt_text: formText,
        variables: detectedVars,
        is_active: formActive,
      };
      setPrompts((prev) => [...prev, newPrompt]);
      toast.success(t.createSuccess);
    }

    setFormOpen(false);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setPrompts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast.success(t.deleteSuccess);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  function handleToggleActive(prompt: Prompt) {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === prompt.id ? { ...p, is_active: !p.is_active } : p
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-1 h-4 w-4" />
          {t.addNew}
        </Button>
      </div>

      {/* Prompts DataTable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.title}</CardTitle>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t.noPrompts}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.name}</TableHead>
                    <TableHead>{t.promptText}</TableHead>
                    <TableHead>{t.variables}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell className="font-medium">
                        {prompt.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className="max-w-[300px] truncate block text-sm text-muted-foreground"
                          title={prompt.prompt_text}
                        >
                          {prompt.prompt_text}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prompt.variables.map((v) => (
                            <Badge
                              key={v}
                              variant="secondary"
                              className="text-xs"
                            >
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={prompt.is_active ? "default" : "outline"}
                          className={
                            prompt.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {prompt.is_active ? t.isActive : t.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditForm(prompt)}
                            >
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              {t.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(prompt)}
                            >
                              {prompt.is_active ? (
                                <>
                                  <PowerOff className="mr-2 h-3.5 w-3.5" />
                                  {t.inactive}
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-3.5 w-3.5" />
                                  {t.isActive}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeleteTarget(prompt);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              {t.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Template Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {t.templateVariables}
          </CardTitle>
          <CardDescription>{t.templateVariablesDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_VARIABLES.map((tv) => (
              <div
                key={tv.name}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Badge variant="secondary" className="font-mono text-xs shrink-0">
                  {tv.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t[tv.descriptionKey]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? t.editPrompt : t.addNew}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt ? t.editDescription : t.addDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="prompt-name">{t.name}</Label>
              <Input
                id="prompt-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.name}
              />
            </div>

            {/* Prompt Text */}
            <div className="space-y-2">
              <Label htmlFor="prompt-text">{t.promptText}</Label>
              <Textarea
                id="prompt-text"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder={t.promptTextPlaceholder}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {/* Detected Variables */}
            {detectedVars.length > 0 && (
              <div className="space-y-2">
                <Label>
                  {t.variables}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({t.autoDetected})
                  </span>
                </Label>
                <div className="flex flex-wrap gap-1">
                  {detectedVars.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Active Switch */}
            <div className="flex items-center gap-3">
              <Switch
                id="prompt-active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
              <Label htmlFor="prompt-active">{t.isActive}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formName.trim() || !formText.trim()}
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.deleteConfirmDescription.replace(
                "{name}",
                deleteTarget?.name ?? ""
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
