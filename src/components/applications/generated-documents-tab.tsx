"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { LetterEditor } from "@/components/letter-templates/letter-editor";
import {
  Download, Eye, RefreshCw, Loader2, FileText, Hotel, AlertCircle, Pencil
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedDoc {
  id: string;
  application_id: number;
  type: string;
  hotel_id: string | null;
  file_path: string | null;
  content: string | null;
  status: string;
  error_message: string | null;
  generated_by: string;
  created_at: string;
  updated_at: string;
  booking_hotels: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface HotelOption {
  id: string;
  name: string;
  type: string;
}

interface GeneratedDocumentsTabProps {
  applicationId: number | null;
}

export function GeneratedDocumentsTab({ applicationId }: GeneratedDocumentsTabProps) {
  const t = useTranslations("generatedDocuments");
  const tCommon = useTranslations("common");

  const [docs, setDocs] = React.useState<GeneratedDoc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hotels, setHotels] = React.useState<HotelOption[]>([]);
  const [selectedHotel, setSelectedHotel] = React.useState<string>("");
  const [generating, setGenerating] = React.useState<string | null>(null); // "booking" or "letter" or null
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorContent, setEditorContent] = React.useState("");
  const [editorDocId, setEditorDocId] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createClient(), []);

  const fetchDocs = React.useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("generated_documents")
      .select("*, booking_hotels(id, name, type)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    setDocs((data ?? []) as GeneratedDoc[]);
    setLoading(false);
  }, [applicationId, supabase]);

  // Fetch hotels for selector
  const fetchHotels = React.useCallback(async () => {
    const { data } = await supabase
      .from("booking_hotels")
      .select("id, name, type")
      .eq("is_active", true)
      .order("sort_order");
    setHotels((data ?? []) as HotelOption[]);
  }, [supabase]);

  React.useEffect(() => {
    fetchDocs();
    fetchHotels();
  }, [fetchDocs, fetchHotels]);

  const bookingDoc = docs.find(d => d.type === "booking_pdf");
  const letterDoc = docs.find(d => d.type === "letter_of_intent");

  // Status badge helper
  function StatusBadge({ status }: { status: string }) {
    const colorMap: Record<string, string> = {
      generating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <Badge variant="outline" className={`text-xs ${colorMap[status] ?? ""}`}>
        {t(status as "generating" | "ready" | "error")}
      </Badge>
    );
  }

  // View PDF via Supabase Storage public URL
  function handleViewPdf(filePath: string | null) {
    if (!filePath) return;
    const { data } = supabase.storage.from("generated-docs").getPublicUrl(filePath);
    window.open(data.publicUrl, "_blank");
  }

  // Download PDF
  async function handleDownload(filePath: string | null, filename: string) {
    if (!filePath) return;
    const { data } = await supabase.storage
      .from("generated-docs")
      .createSignedUrl(filePath, 60);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = filename;
      a.click();
    }
  }

  // Trigger server-side generation via API route
  async function triggerGeneration() {
    if (!applicationId) return;
    await fetch("/api/generate-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
  }

  // Generate booking PDF manually
  async function handleGenerateBooking(hotelId: string) {
    if (!applicationId || !hotelId) return;
    setGenerating("booking");
    try {
      // Trigger server-side generation
      await triggerGeneration();
      toast.success(t("generating"));
      // Poll for status update
      setTimeout(() => fetchDocs(), 2000);
      setTimeout(() => fetchDocs(), 5000);
      setTimeout(() => fetchDocs(), 10000);
    } catch {
      toast.error(t("error"));
    } finally {
      setGenerating(null);
    }
  }

  // Generate letter manually
  async function handleGenerateLetter() {
    if (!applicationId) return;
    setGenerating("letter");
    try {
      await triggerGeneration();
      toast.success(t("generating"));
      setTimeout(() => fetchDocs(), 2000);
      setTimeout(() => fetchDocs(), 5000);
      setTimeout(() => fetchDocs(), 10000);
    } catch {
      toast.error(t("error"));
    } finally {
      setGenerating(null);
    }
  }

  // Open letter editor
  function handleEditLetter() {
    if (!letterDoc) return;
    setEditorContent(letterDoc.content || "");
    setEditorDocId(letterDoc.id);
    setEditorOpen(true);
  }

  // Save letter edits
  async function handleSaveLetter(html: string) {
    if (!editorDocId) return;
    const { error } = await supabase
      .from("generated_documents")
      .update({ content: html, updated_at: new Date().toISOString() })
      .eq("id", editorDocId);
    if (error) {
      toast.error(t("error"));
      return;
    }
    toast.success(t("saveLetter"));
    setEditorOpen(false);
    await fetchDocs();
  }

  // Regenerate: reset existing record to 'generating' and trigger server-side generation
  async function handleRegenerate(type: string) {
    if (!applicationId) return;
    setGenerating(type === "booking_pdf" ? "booking" : "letter");
    try {
      // Reset existing record status
      await supabase
        .from("generated_documents")
        .update({ status: "generating", error_message: null, updated_at: new Date().toISOString() })
        .eq("application_id", applicationId)
        .eq("type", type);

      // Trigger server-side generation
      await triggerGeneration();
      toast.success(t("generating"));
      await fetchDocs();
      setTimeout(() => fetchDocs(), 3000);
      setTimeout(() => fetchDocs(), 8000);
    } catch {
      toast.error(t("error"));
    } finally {
      setGenerating(null);
    }
  }

  if (!applicationId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Booking PDF Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Hotel className="h-4 w-4" />
                {t("bookingPdf")}
              </CardTitle>
              {bookingDoc && <StatusBadge status={bookingDoc.status} />}
            </div>
          </CardHeader>
          <CardContent>
            {bookingDoc ? (
              <div className="space-y-3">
                {bookingDoc.booking_hotels && (
                  <p className="text-sm text-muted-foreground">
                    {t("hotel")}: <span className="font-medium text-foreground">{bookingDoc.booking_hotels.name}</span>
                  </p>
                )}

                {bookingDoc.status === "ready" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleViewPdf(bookingDoc.file_path)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("viewPdf")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(bookingDoc.file_path, "booking.pdf")}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> {t("downloadPdf")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRegenerate("booking_pdf")} disabled={generating === "booking"}>
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating === "booking" ? "animate-spin" : ""}`} /> {t("regenerate")}
                    </Button>
                  </div>
                )}

                {bookingDoc.status === "generating" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("generating")}
                  </div>
                )}

                {bookingDoc.status === "error" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" /> {bookingDoc.error_message || t("error")}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRegenerate("booking_pdf")} disabled={generating === "booking"}>
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating === "booking" ? "animate-spin" : ""}`} /> {t("retry")}
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("generatedOn")}: {new Date(bookingDoc.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
                <div className="flex items-center gap-2">
                  <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={t("selectHotel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {hotels.map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.name} ({h.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateBooking(selectedHotel)}
                    disabled={!selectedHotel || generating === "booking"}
                  >
                    {generating === "booking" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {t("generateBooking")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Letter of Intent Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("letterOfIntent")}
              </CardTitle>
              {letterDoc && <StatusBadge status={letterDoc.status} />}
            </div>
          </CardHeader>
          <CardContent>
            {letterDoc ? (
              <div className="space-y-3">
                {letterDoc.status === "ready" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {letterDoc.file_path && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleViewPdf(letterDoc.file_path)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("viewPdf")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(letterDoc.file_path, "letter-of-intent.pdf")}>
                          <Download className="mr-1.5 h-3.5 w-3.5" /> {t("downloadPdf")}
                        </Button>
                      </>
                    )}
                    {letterDoc.content && (
                      <Button size="sm" variant="outline" onClick={handleEditLetter}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("editLetter")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleRegenerate("letter_of_intent")} disabled={generating === "letter"}>
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating === "letter" ? "animate-spin" : ""}`} /> {t("regenerate")}
                    </Button>
                  </div>
                )}

                {letterDoc.status === "generating" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("generating")}
                  </div>
                )}

                {letterDoc.status === "error" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" /> {letterDoc.error_message || t("error")}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRegenerate("letter_of_intent")} disabled={generating === "letter"}>
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating === "letter" ? "animate-spin" : ""}`} /> {t("retry")}
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("generatedOn")}: {new Date(letterDoc.created_at).toLocaleDateString()}
                  {letterDoc.updated_at !== letterDoc.created_at && (
                    <> · {t("lastEdited")}: {new Date(letterDoc.updated_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
                <Button
                  size="sm"
                  onClick={handleGenerateLetter}
                  disabled={generating === "letter"}
                >
                  {generating === "letter" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {t("generateLetter")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Letter Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editLetter")}</DialogTitle>
          </DialogHeader>
          <LetterEditor
            content={editorContent}
            onSave={handleSaveLetter}
            onClose={() => setEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
