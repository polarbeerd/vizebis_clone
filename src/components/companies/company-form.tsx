"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// Schema
const companySchema = z.object({
  customer_type: z.string().default("bireysel"),
  company_name: z.string().min(1, "Company name is required"),
  company_code: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  tax_number: z.string().default(""),
  tax_office: z.string().default(""),
  password: z.string().default(""),
  province: z.string().default(""),
  district: z.string().default(""),
  address: z.string().default(""),
});

type CompanyFormValues = z.output<typeof companySchema>;

// Types
export interface CompanyForForm {
  id: number;
  customer_type?: string | null;
  company_name?: string | null;
  company_code?: string | null;
  phone?: string | null;
  email?: string | null;
  tax_number?: string | null;
  tax_office?: string | null;
  password?: string | null;
  province?: string | null;
  district?: string | null;
  address?: string | null;
}

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyForForm;
  onSuccess: () => void;
}

export function CompanyForm({
  open,
  onOpenChange,
  company,
  onSuccess,
}: CompanyFormProps) {
  const t = useTranslations("companies");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const isEdit = !!company;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<CompanyFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(companySchema) as any,
    defaultValues: {
      customer_type: "bireysel",
      company_name: "",
      company_code: "",
      phone: "",
      email: "",
      tax_number: "",
      tax_office: "",
      password: "",
      province: "",
      district: "",
      address: "",
    },
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && company) {
      form.reset({
        customer_type: company.customer_type ?? "bireysel",
        company_name: company.company_name ?? "",
        company_code: company.company_code ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        tax_number: company.tax_number ?? "",
        tax_office: company.tax_office ?? "",
        password: company.password ?? "",
        province: company.province ?? "",
        district: company.district ?? "",
        address: company.address ?? "",
      });
    } else if (open && !company) {
      form.reset();
    }
  }, [open, company, form]);

  async function onSubmit(values: CompanyFormValues) {
    setLoading(true);

    const payload: Record<string, unknown> = {
      customer_type: values.customer_type || "bireysel",
      company_name: values.company_name,
      company_code: values.company_code || null,
      phone: values.phone || null,
      email: values.email || null,
      tax_number: values.tax_number || null,
      tax_office: values.tax_office || null,
      password: values.password || null,
      province: values.province || null,
      district: values.district || null,
      address: values.address || null,
    };

    try {
      if (isEdit && company) {
        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", company.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("companies").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Company save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {isEdit ? t("editCompany") : t("addNew")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {/* Customer Type Radio */}
                <FormField
                  control={form.control}
                  name="customer_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("customerType")}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bireysel" id="bireysel" />
                            <Label htmlFor="bireysel">{t("individual")}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="kurumsal" id="kurumsal" />
                            <Label htmlFor="kurumsal">{t("corporate")}</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("companyName")} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("companyCode")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("phone")}</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("email")}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxNumber")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax_office"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxOffice")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("password")}</FormLabel>
                        <FormControl>
                          <Input type="text" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("province")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("district")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("address")}</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
