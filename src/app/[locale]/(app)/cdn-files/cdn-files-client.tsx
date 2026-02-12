"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  HardDrive,
  Upload,
  Download,
  Trash2,
  Link as LinkIcon,
  File,
  Search,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

interface CdnFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

interface Props {
  userId: string;
  userEmail: string;
  initialFiles: CdnFile[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function CdnFilesClient({ userId, userEmail, initialFiles }: Props) {
  const t = useTranslations("cdnFiles");
  const tCommon = useTranslations("common");

  const [files, setFiles] = React.useState<CdnFile[]>(initialFiles);
  const [uploading, setUploading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deleteFile, setDeleteFile] = React.useState<CdnFile | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const filePath = `${userId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("cdn-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: record, error: dbError } = await supabase
          .from("cdn_files")
          .insert({
            file_name: file.name,
            file_size: file.size,
            file_type: file.type || "application/octet-stream",
            storage_path: filePath,
            uploaded_by: userId,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setFiles((prev) => [record, ...prev]);
      }

      toast.success(t("uploadSuccess"));
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete() {
    if (!deleteFile) return;

    try {
      await supabase.storage.from("cdn-files").remove([deleteFile.storage_path]);

      const { error } = await supabase
        .from("cdn_files")
        .delete()
        .eq("id", deleteFile.id);

      if (error) throw error;

      setFiles((prev) => prev.filter((f) => f.id !== deleteFile.id));
      toast.success(t("deleteSuccess"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeleteFile(null);
    }
  }

  async function handleCopyLink(file: CdnFile) {
    const { data } = supabase.storage
      .from("cdn-files")
      .getPublicUrl(file.storage_path);

    if (data?.publicUrl) {
      await navigator.clipboard.writeText(data.publicUrl);
      toast.success(t("linkCopied"));
    }
  }

  function handleDownload(file: CdnFile) {
    const { data } = supabase.storage
      .from("cdn-files")
      .getPublicUrl(file.storage_path);

    if (data?.publicUrl) {
      window.open(data.publicUrl, "_blank");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  }

  const filteredFiles = searchQuery.trim()
    ? files.filter((f) =>
        f.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  const totalSize = files.reduce((acc, f) => acc + (f.file_size || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HardDrive className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload Area */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t("uploadArea")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
            >
              <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground text-center mb-3">
                {t("dragDrop")}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? tCommon("loading") : t("selectFile")}
              </Button>
            </div>

            {/* Storage usage indicator */}
            <div className="mt-4 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {t("storageUsage")}
              </p>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min((totalSize / (1024 * 1024 * 500)) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(totalSize)} / 500 MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("fileList")}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <File className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">{t("noFiles")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fileName")}</TableHead>
                      <TableHead>{t("fileSize")}</TableHead>
                      <TableHead>{t("fileType")}</TableHead>
                      <TableHead>{t("uploadDate")}</TableHead>
                      <TableHead className="text-right">
                        {tCommon("actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {file.file_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {file.file_type.split("/").pop() ?? file.file_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(file.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload(file)}
                              title={t("download")}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyLink(file)}
                              title={t("copyLink")}
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteFile(file)}
                              title={t("deleteFile")}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteFile
              ? t("deleteConfirmDescription", { name: deleteFile.file_name })
              : ""}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFile(null)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
