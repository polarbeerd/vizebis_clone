"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  FolderOpen,
  Lock,
  ExternalLink,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";
import type {
  PasswordCategory,
  PasswordEntry,
  ApplicationOption,
} from "./page";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Props {
  initialCategories: PasswordCategory[];
  initialPasswords: PasswordEntry[];
  applicationOptions: ApplicationOption[];
}

export function PasswordsClient({
  initialCategories,
  initialPasswords,
  applicationOptions,
}: Props) {
  const t = useTranslations("passwords");
  const tCommon = useTranslations("common");

  const [categories, setCategories] =
    React.useState<PasswordCategory[]>(initialCategories);
  const [passwords, setPasswords] =
    React.useState<PasswordEntry[]>(initialPasswords);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<
    string | null
  >(null);

  // Visible passwords
  const [visiblePasswords, setVisiblePasswords] = React.useState<Set<string>>(
    new Set()
  );

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] =
    React.useState<PasswordCategory | null>(null);
  const [catName, setCatName] = React.useState("");

  // Password dialog
  const [pwDialogOpen, setPwDialogOpen] = React.useState(false);
  const [editingPassword, setEditingPassword] =
    React.useState<PasswordEntry | null>(null);
  const [formTitle, setFormTitle] = React.useState("");
  const [formCategoryId, setFormCategoryId] = React.useState<string>("");
  const [formApplicationId, setFormApplicationId] = React.useState<string>("");
  const [formUsername, setFormUsername] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");
  const [showFormPassword, setShowFormPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const supabase = createClient();

  const filteredPasswords = selectedCategoryId
    ? passwords.filter((p) => p.category_id === selectedCategoryId)
    : passwords;

  function getCategoryName(categoryId: string | null): string {
    if (!categoryId) return "-";
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name ?? "-";
  }

  function getApplicationName(applicationId: string | null): string {
    if (!applicationId) return "-";
    const app = applicationOptions.find((a) => a.id === applicationId);
    return app?.full_name ?? "-";
  }

  function togglePasswordVisibility(id: string) {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function copyPassword(password: string) {
    navigator.clipboard.writeText(password);
    toast.success(t("passwordCopied"));
  }

  // Category CRUD
  function openAddCategory() {
    setEditingCategory(null);
    setCatName("");
    setCatDialogOpen(true);
  }

  function openEditCategory(cat: PasswordCategory) {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDialogOpen(true);
  }

  async function handleSaveCategory() {
    if (!catName.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("password_categories")
          .update({ name: catName.trim() })
          .eq("id", editingCategory.id);
        if (error) throw error;
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingCategory.id ? { ...c, name: catName.trim() } : c
          )
        );
        toast.success(t("categoryUpdateSuccess"));
      } else {
        const { data, error } = await supabase
          .from("password_categories")
          .insert({ name: catName.trim() })
          .select()
          .single();
        if (error) throw error;
        setCategories((prev) =>
          [...prev, data as PasswordCategory].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        toast.success(t("categoryCreateSuccess"));
      }
      setCatDialogOpen(false);
    } catch {
      toast.error(t("categorySaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    const { error } = await supabase
      .from("password_categories")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(t("categoryDeleteError"));
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      toast.success(t("categoryDeleteSuccess"));
    }
  }

  // Password CRUD
  function openAddPassword() {
    setEditingPassword(null);
    setFormTitle("");
    setFormCategoryId(selectedCategoryId ?? "");
    setFormApplicationId("");
    setFormUsername("");
    setFormPassword("");
    setFormUrl("");
    setFormNotes("");
    setShowFormPassword(false);
    setPwDialogOpen(true);
  }

  function openEditPassword(pw: PasswordEntry) {
    setEditingPassword(pw);
    setFormTitle(pw.title);
    setFormCategoryId(pw.category_id ?? "");
    setFormApplicationId(pw.application_id ?? "");
    setFormUsername(pw.username);
    setFormPassword(pw.password);
    setFormUrl(pw.url ?? "");
    setFormNotes(pw.notes ?? "");
    setShowFormPassword(false);
    setPwDialogOpen(true);
  }

  async function handleSavePassword() {
    if (!formTitle.trim() || !formUsername.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        category_id: formCategoryId || null,
        application_id: formApplicationId || null,
        username: formUsername.trim(),
        password: formPassword,
        url: formUrl.trim() || null,
        notes: formNotes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingPassword) {
        const { error } = await supabase
          .from("passwords")
          .update(payload)
          .eq("id", editingPassword.id);
        if (error) throw error;
        setPasswords((prev) =>
          prev.map((p) =>
            p.id === editingPassword.id ? { ...p, ...payload } : p
          )
        );
        toast.success(t("updateSuccess"));
      } else {
        const { data, error } = await supabase
          .from("passwords")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setPasswords((prev) => [data as PasswordEntry, ...prev]);
        toast.success(t("createSuccess"));
      }
      setPwDialogOpen(false);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePassword(id: string) {
    const { error } = await supabase.from("passwords").delete().eq("id", id);
    if (error) {
      toast.error(t("deleteError"));
    } else {
      setPasswords((prev) => prev.filter((p) => p.id !== id));
      toast.success(t("deleteSuccess"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openAddPassword}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addPassword")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {t("categories")}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={openAddCategory}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                <div className="px-2 pb-2">
                  {/* All option */}
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                      selectedCategoryId === null
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    <span>{tCommon("all")}</span>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {passwords.length}
                    </Badge>
                  </button>

                  <Separator className="my-1" />

                  {categories.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {t("noCategories")}
                    </p>
                  ) : (
                    categories.map((cat) => {
                      const count = passwords.filter(
                        (p) => p.category_id === cat.id
                      ).length;
                      return (
                        <div
                          key={cat.id}
                          className={cn(
                            "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                            selectedCategoryId === cat.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <button
                            className="flex-1 text-left truncate"
                            onClick={() => setSelectedCategoryId(cat.id)}
                          >
                            {cat.name}
                          </button>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="secondary"
                              className="h-5 text-xs"
                            >
                              {count}
                            </Badge>
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditCategory(cat);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Passwords Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t("passwordList")}
                {selectedCategoryId && (
                  <Badge variant="outline" className="ml-2">
                    {getCategoryName(selectedCategoryId)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPasswords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {t("noPasswords")}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("passwordTitle")}</TableHead>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("username")}</TableHead>
                        <TableHead>{t("passwordField")}</TableHead>
                        <TableHead>{t("url")}</TableHead>
                        <TableHead>{t("application")}</TableHead>
                        <TableHead className="text-right">
                          {tCommon("actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPasswords.map((pw) => (
                        <TableRow key={pw.id}>
                          <TableCell className="font-medium">
                            {pw.title}
                          </TableCell>
                          <TableCell>
                            {getCategoryName(pw.category_id)}
                          </TableCell>
                          <TableCell>{pw.username}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-sm">
                                {visiblePasswords.has(pw.id)
                                  ? pw.password
                                  : "********"}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  togglePasswordVisibility(pw.id)
                                }
                              >
                                {visiblePasswords.has(pw.id) ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyPassword(pw.password)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pw.url ? (
                              <a
                                href={pw.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {new URL(pw.url).hostname}
                              </a>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {getApplicationName(pw.application_id)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditPassword(pw)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDeletePassword(pw.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t("editCategory") : t("addCategory")}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? t("editCategoryDesc")
                : t("addCategoryDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("categoryName")}</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder={t("categoryNamePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCatDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSaveCategory} disabled={saving}>
              {saving ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPassword ? t("editPassword") : t("addPassword")}
            </DialogTitle>
            <DialogDescription>
              {editingPassword ? t("editPasswordDesc") : t("addPasswordDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>{t("passwordTitle")}</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Select
                value={formCategoryId}
                onValueChange={setFormCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("application")}</Label>
              <Select
                value={formApplicationId}
                onValueChange={setFormApplicationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectApplication")} />
                </SelectTrigger>
                <SelectContent>
                  {applicationOptions.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("username")}</Label>
              <Input
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder={t("usernamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("passwordField")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showFormPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                >
                  {showFormPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("url")}</Label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder={t("urlPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("notes")}</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPwDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSavePassword} disabled={saving}>
              {saving ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
