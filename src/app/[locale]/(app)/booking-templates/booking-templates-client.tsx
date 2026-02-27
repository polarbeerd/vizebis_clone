"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Building2,
  Edit,
  Eye,
  FileDown,
  Globe,
  Mail,
  Phone,
  Plus,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HotelRow } from "./page";
import { HotelForm } from "@/components/booking-templates/hotel-form";
import { CreateBookingDialog } from "@/components/booking-templates/create-booking-dialog";

interface BookingTemplatesClientProps {
  data: HotelRow[];
}

export function BookingTemplatesClient({ data }: BookingTemplatesClientProps) {
  const t = useTranslations("bookingTemplates");
  const tCreate = useTranslations("createBooking");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [formOpen, setFormOpen] = React.useState(false);
  const [formHotel, setFormHotel] = React.useState<HotelRow | undefined>(
    undefined
  );

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<HotelRow | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);

  const [createBookingOpen, setCreateBookingOpen] = React.useState(false);
  const [createBookingHotel, setCreateBookingHotel] = React.useState<
    HotelRow | undefined
  >(undefined);

  const supabase = React.useMemo(() => createClient(), []);

  // Group hotels by country
  const groupedByCountry = React.useMemo(() => {
    const groups: Record<string, HotelRow[]> = {};
    for (const hotel of data) {
      const key = hotel.country || t("noCountry");
      if (!groups[key]) groups[key] = [];
      groups[key].push(hotel);
    }
    // Sort country keys alphabetically, but push "noCountry" to the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const noCountry = t("noCountry");
      if (a === noCountry) return 1;
      if (b === noCountry) return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map((key) => ({ country: key, hotels: groups[key] }));
  }, [data, t]);

  function handleAddHotel() {
    setFormHotel(undefined);
    setFormOpen(true);
  }

  function handleEditHotel(hotel: HotelRow) {
    setFormHotel(hotel);
    setFormOpen(true);
  }

  function handleDeleteHotel(hotel: HotelRow) {
    setDeleteTarget(hotel);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      // Delete the PDF from storage first
      if (deleteTarget.template_path) {
        await supabase.storage
          .from("booking-templates")
          .remove([deleteTarget.template_path]);
      }

      const { error } = await supabase
        .from("booking_hotels")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast.success(t("deleteSuccess"));
      router.refresh();
    } catch (err) {
      console.error("Error deleting hotel:", err);
      toast.error(tCommon("delete") + " error");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  }

  async function handleToggleActive(hotel: HotelRow) {
    const newActive = !hotel.is_active;

    const { error } = await supabase
      .from("booking_hotels")
      .update({ is_active: newActive })
      .eq("id", hotel.id);

    if (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update status");
    } else {
      router.refresh();
    }
  }

  function handlePreview(hotel: HotelRow) {
    if (!hotel.template_path) {
      toast.error(t("uploadError"));
      return;
    }

    const { data: urlData } = supabase.storage
      .from("booking-templates")
      .getPublicUrl(hotel.template_path);

    if (urlData?.publicUrl) {
      window.open(urlData.publicUrl, "_blank");
    }
  }

  function handleFormSuccess() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="mr-1 size-4" />
            {tCommon("refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCreateBookingHotel(undefined);
              setCreateBookingOpen(true);
            }}
          >
            <FileDown className="mr-1 size-4" />
            {tCreate("createBooking")}
          </Button>
          <Button variant="default" size="sm" onClick={handleAddHotel}>
            <Plus className="mr-1 size-4" />
            {t("addHotel")}
          </Button>
        </div>
      </div>

      {/* Content */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Building2 className="text-muted-foreground mb-4 size-12" />
          <p className="text-muted-foreground text-lg font-medium">
            {t("noHotels")}
          </p>
          <Button
            variant="default"
            size="sm"
            className="mt-4"
            onClick={handleAddHotel}
          >
            <Plus className="mr-1 size-4" />
            {t("addHotel")}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByCountry.map(({ country, hotels }) => (
            <div key={country}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                {country}
                <Badge variant="secondary" className="text-xs">
                  {hotels.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hotels.map((hotel) => (
                  <Card
                    key={hotel.id}
                    className={!hotel.is_active ? "opacity-60" : ""}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{hotel.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {hotel.address && (
                        <div className="text-muted-foreground flex items-start gap-2 text-sm">
                          <Building2 className="mt-0.5 size-3.5 shrink-0" />
                          <span className="line-clamp-2">{hotel.address}</span>
                        </div>
                      )}
                      {hotel.phone && (
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <Phone className="size-3.5 shrink-0" />
                          <span>{hotel.phone}</span>
                        </div>
                      )}
                      {hotel.email && (
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <Mail className="size-3.5 shrink-0" />
                          <span className="truncate">{hotel.email}</span>
                        </div>
                      )}
                      {hotel.website && (
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <Globe className="size-3.5 shrink-0" />
                          <span className="truncate">{hotel.website}</span>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={hotel.is_active}
                          onCheckedChange={() => handleToggleActive(hotel)}
                          size="sm"
                        />
                        <span className="text-muted-foreground text-xs">
                          {hotel.is_active ? t("active") : t("inactive")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setCreateBookingHotel(hotel);
                            setCreateBookingOpen(true);
                          }}
                          title={tCreate("createBooking")}
                        >
                          <FileDown className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handlePreview(hotel)}
                          title={t("preview")}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleEditHotel(hotel)}
                          title={tCommon("edit")}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteHotel(hotel)}
                          title={tCommon("delete")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hotel form dialog */}
      <HotelForm
        open={formOpen}
        onOpenChange={setFormOpen}
        hotel={formHotel}
        onSuccess={handleFormSuccess}
      />

      {/* Create booking dialog */}
      <CreateBookingDialog
        open={createBookingOpen}
        onOpenChange={setCreateBookingOpen}
        hotels={data}
        defaultHotel={createBookingHotel}
      />

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteHotel")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm")}</DialogDescription>
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
    </div>
  );
}
