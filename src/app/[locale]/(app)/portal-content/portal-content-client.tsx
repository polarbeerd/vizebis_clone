"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Video, BookOpen, Save, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GuideRow, CountryOption } from "./page";

// ── Local item types ────────────────────────────────────────

interface VideoItem {
  _key: string;
  id: number | null;
  title: string;
  video_url: string;
  sort_order: number;
}

interface KeyPointItem {
  _key: string;
  id: number | null;
  content: string;
  sort_order: number;
}

// ── Props ───────────────────────────────────────────────────

interface CountryGuidesClientProps {
  data: GuideRow[];
  countries: CountryOption[];
}

export function CountryGuidesClient({ data, countries }: CountryGuidesClientProps) {
  const t = useTranslations("portalContent");
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  // ── State ───────────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = React.useState<string>("");
  const [localVideos, setLocalVideos] = React.useState<VideoItem[]>([]);
  const [localKeyPoints, setLocalKeyPoints] = React.useState<KeyPointItem[]>([]);
  const [deletedIds, setDeletedIds] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);

  // ── Sync local state when country changes ─────────────
  React.useEffect(() => {
    if (!selectedCountry) {
      setLocalVideos([]);
      setLocalKeyPoints([]);
      setDeletedIds([]);
      return;
    }

    const videos = data
      .filter((r) => r.country === selectedCountry && r.content_type === "video")
      .map((r) => ({
        _key: crypto.randomUUID(),
        id: r.id,
        title: r.title,
        video_url: r.video_url ?? "",
        sort_order: r.sort_order,
      }));

    const keyPoints = data
      .filter((r) => r.country === selectedCountry && r.content_type === "key_point")
      .map((r) => ({
        _key: crypto.randomUUID(),
        id: r.id,
        content: r.content,
        sort_order: r.sort_order,
      }));

    setLocalVideos(videos);
    setLocalKeyPoints(keyPoints);
    setDeletedIds([]);
  }, [selectedCountry, data]);

  // ── Add handlers ──────────────────────────────────────
  function addVideo() {
    setLocalVideos((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        id: null,
        title: "",
        video_url: "",
        sort_order: prev.length,
      },
    ]);
  }

  function addKeyPoint() {
    setLocalKeyPoints((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        id: null,
        content: "",
        sort_order: prev.length,
      },
    ]);
  }

  // ── Delete handlers ───────────────────────────────────
  function deleteVideo(index: number) {
    setLocalVideos((prev) => {
      const item = prev[index];
      if (item.id !== null) {
        setDeletedIds((ids) => [...ids, item.id!]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function deleteKeyPoint(index: number) {
    setLocalKeyPoints((prev) => {
      const item = prev[index];
      if (item.id !== null) {
        setDeletedIds((ids) => [...ids, item.id!]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Update handlers ───────────────────────────────────
  function updateVideo(index: number, field: "title" | "video_url", value: string) {
    setLocalVideos((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function updateKeyPoint(index: number, value: string) {
    setLocalKeyPoints((prev) =>
      prev.map((item, i) => (i === index ? { ...item, content: value } : item))
    );
  }

  // ── Save handler ──────────────────────────────────────
  async function handleSave() {
    setSaving(true);

    try {
      // Step 1: Delete removed items
      if (deletedIds.length > 0) {
        const { error } = await supabase
          .from("portal_content")
          .delete()
          .in("id", deletedIds);
        if (error) throw error;
      }

      // Step 2: Upsert videos (update existing, insert new)
      for (let i = 0; i < localVideos.length; i++) {
        const v = localVideos[i];
        if (v.id !== null) {
          const { error } = await supabase
            .from("portal_content")
            .update({ title: v.title, video_url: v.video_url, sort_order: i })
            .eq("id", v.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("portal_content").insert({
            title: v.title,
            video_url: v.video_url,
            content_type: "video",
            country: selectedCountry,
            content: "",
            sort_order: i,
            is_published: true,
          });
          if (error) throw error;
        }
      }

      // Step 3: Upsert key points (update existing, insert new)
      for (let i = 0; i < localKeyPoints.length; i++) {
        const kp = localKeyPoints[i];
        if (kp.id !== null) {
          const { error } = await supabase
            .from("portal_content")
            .update({ content: kp.content, sort_order: i })
            .eq("id", kp.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("portal_content").insert({
            title: "",
            content: kp.content,
            content_type: "key_point",
            country: selectedCountry,
            sort_order: i,
            is_published: true,
          });
          if (error) throw error;
        }
      }

      toast.success(t("saveSuccess"));
      router.refresh();
    } catch (err) {
      console.error("Error saving guide content:", err);
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Country selector */}
      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue placeholder={t("selectCountryPrompt")} />
        </SelectTrigger>
        <SelectContent>
          {countries.map((c) => (
            <SelectItem key={c.id} value={c.name}>
              {c.flag_emoji ? `${c.flag_emoji} ` : ""}
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCountry ? (
        <>
          {/* ── Videos Section ──────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="size-5" />
                {t("videosSection")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {localVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noVideos")}</p>
              ) : (
                localVideos.map((video, index) => (
                  <div key={video._key} className="flex items-center gap-2">
                    <Input
                      placeholder={t("videoTitle")}
                      value={video.title}
                      onChange={(e) => updateVideo(index, "title", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder={t("videoUrlPlaceholder")}
                      value={video.video_url}
                      onChange={(e) => updateVideo(index, "video_url", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVideo(index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" onClick={addVideo}>
                <Plus className="mr-1 size-4" />
                {t("addVideo")}
              </Button>
            </CardContent>
          </Card>

          {/* ── Key Points Section ──────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5" />
                {t("keyPointsSection")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {localKeyPoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noKeyPoints")}</p>
              ) : (
                localKeyPoints.map((kp, index) => (
                  <div key={kp._key} className="flex items-center gap-2">
                    <Input
                      placeholder={t("keyPointText")}
                      value={kp.content}
                      onChange={(e) => updateKeyPoint(index, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteKeyPoint(index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" onClick={addKeyPoint}>
                <Plus className="mr-1 size-4" />
                {t("addKeyPoint")}
              </Button>
            </CardContent>
          </Card>

          {/* ── Save Button ─────────────────────────────── */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Save className="mr-1 size-4" />
              )}
              {t("saveAll")}
            </Button>
          </div>
        </>
      ) : (
        /* No country selected prompt */
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">{t("selectCountryPrompt")}</p>
        </div>
      )}
    </div>
  );
}
