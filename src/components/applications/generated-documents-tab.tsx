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
  Copy, Download, Eye, RefreshCw, Loader2, FileText, Hotel, AlertCircle, Pencil, Trash2
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
    address: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    phone_country_code: string | null;
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
      .select("*, booking_hotels(id, name, type, address, postal_code, city, country, email, phone, phone_country_code)")
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

  // Find latest doc per type; treat "generating" records older than 5 min as errors
  const bookingDoc = React.useMemo(() => {
    const doc = docs.find(d => d.type === "booking_pdf");
    if (doc?.status === "generating") {
      const age = Date.now() - new Date(doc.created_at).getTime();
      if (age > 5 * 60 * 1000) return { ...doc, status: "error", error_message: "Generation timed out" };
    }
    return doc ?? null;
  }, [docs]);

  const letterDoc = React.useMemo(() => {
    const doc = docs.find(d => d.type === "letter_of_intent");
    if (doc?.status === "generating") {
      const age = Date.now() - new Date(doc.created_at).getTime();
      if (age > 5 * 60 * 1000) return { ...doc, status: "error", error_message: "Generation timed out" };
    }
    return doc ?? null;
  }, [docs]);

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
  async function triggerGeneration(options?: { hotelId?: string; type?: "booking" | "letter" | "all" }) {
    if (!applicationId) return;
    const res = await fetch("/api/generate-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        hotelId: options?.hotelId,
        type: options?.type ?? "all",
      }),
    });
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }
  }

  // Generate booking PDF manually
  async function handleGenerateBooking(hotelId: string) {
    if (!applicationId || !hotelId) return;
    setGenerating("booking");
    try {
      await triggerGeneration({ hotelId, type: "booking" });
      await fetchDocs();
      toast.success(t("ready"));
    } catch {
      toast.error(t("error"));
    } finally {
      setGenerating(null);
    }
  }

  // Generate letter manually (requires booking to exist for hotel data)
  async function handleGenerateLetter() {
    if (!applicationId) return;
    const hotelId = bookingDoc?.booking_hotels?.id;
    setGenerating("letter");
    try {
      await triggerGeneration({ hotelId, type: "letter" });
      await fetchDocs();
      toast.success(t("ready"));
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

  // Save letter edits + regenerate PDF
  async function handleSaveLetter(html: string) {
    if (!editorDocId) return;
    try {
      const res = await fetch("/api/regenerate-letter-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: editorDocId, html }),
      });
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      toast.success(t("saveLetter"));
      setEditorOpen(false);
      await fetchDocs();
    } catch {
      toast.error(t("error"));
    }
  }

  // Regenerate: delete old record, trigger server-side generation, fetch result
  async function handleRegenerate(docType: string) {
    if (!applicationId) return;
    const isBooking = docType === "booking_pdf";
    setGenerating(isBooking ? "booking" : "letter");
    try {
      // Delete old record so the server creates a fresh one
      await supabase
        .from("generated_documents")
        .delete()
        .eq("application_id", applicationId)
        .eq("type", docType);

      // Trigger server-side generation (only the requested type)
      const genType = isBooking ? "booking" : "letter";
      // For both booking and letter regeneration, use the existing hotel ID
      const regenHotelId = bookingDoc?.booking_hotels?.id || undefined;

      await triggerGeneration({ hotelId: regenHotelId, type: genType });
      await fetchDocs();
      toast.success(t("ready"));
    } catch {
      toast.error(t("error"));
    } finally {
      setGenerating(null);
    }
  }

  // Delete generated document
  async function handleDelete(docType: string) {
    if (!applicationId) return;
    const doc = docType === "booking_pdf" ? bookingDoc : letterDoc;
    if (!doc) return;

    if (!confirm(t("deleteConfirm"))) return;

    try {
      // Delete file from storage if exists
      if (doc.file_path) {
        await supabase.storage.from("generated-docs").remove([doc.file_path]);
      }
      // Delete DB record
      await supabase.from("generated_documents").delete().eq("id", doc.id);
      await fetchDocs();
      toast.success(t("deleted"));
    } catch {
      toast.error(t("error"));
    }
  }

  // Compact row with label: value + copy button
  function HotelDetailRow({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground min-w-[80px]">{label}:</span>
        <span className="font-medium flex-1">{value}</span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast("Copied!", { duration: 1000 });
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    );
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
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete("booking_pdf")}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("delete")}
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
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRegenerate("booking_pdf")} disabled={generating === "booking"}>
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating === "booking" ? "animate-spin" : ""}`} /> {t("retry")}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete("booking_pdf")}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("delete")}
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("generatedOn")}: {new Date(bookingDoc.created_at).toLocaleDateString()} {new Date(bookingDoc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>

                {/* Hotel Details Copy Section */}
                {bookingDoc.status === "ready" && bookingDoc.booking_hotels && (
                  <div className="mt-4 border-t pt-3 space-y-1.5">
                    <p className="text-sm font-medium">{t("hotelDetails")}</p>
                    <HotelDetailRow label={t("hotel")} value={bookingDoc.booking_hotels.name} />
                    <HotelDetailRow label={t("hotelAddress")} value={bookingDoc.booking_hotels.address} />
                    <HotelDetailRow label={t("hotelPostalCode")} value={bookingDoc.booking_hotels.postal_code} />
                    <HotelDetailRow label={t("hotelCity")} value={bookingDoc.booking_hotels.city} />
                    <HotelDetailRow label={t("hotelEmail")} value={bookingDoc.booking_hotels.email} />
                    <HotelDetailRow
                      label={t("hotelPhone")}
                      value={
                        bookingDoc.booking_hotels.phone
                          ? `${bookingDoc.booking_hotels.phone_country_code ?? ""} ${bookingDoc.booking_hotels.phone}`.trim()
                          : null
                      }
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder={t("selectHotel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {hotels.map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
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
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete("letter_of_intent")}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("delete")}
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
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRegenerate("letter_of_intent")} disabled={generating === "letter"}>
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating === "letter" ? "animate-spin" : ""}`} /> {t("retry")}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete("letter_of_intent")}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("delete")}
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("generatedOn")}: {new Date(letterDoc.created_at).toLocaleDateString()} {new Date(letterDoc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {letterDoc.updated_at !== letterDoc.created_at && (
                    <> · {t("lastEdited")}: {new Date(letterDoc.updated_at).toLocaleDateString()} {new Date(letterDoc.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
                {bookingDoc?.status !== "ready" ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {t("generateLetterRequiresBooking")}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleGenerateLetter}
                    disabled={generating === "letter"}
                  >
                    {generating === "letter" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {t("generateLetter")}
                  </Button>
                )}
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
