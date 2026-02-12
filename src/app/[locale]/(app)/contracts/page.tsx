"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  FileSignature,
  CheckCircle2,
  ScrollText,
  Shield,
  Scale,
  AlertTriangle,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContractSection {
  icon: React.ElementType;
  titleKey: string;
  contentKey: string;
}

const sections: ContractSection[] = [
  { icon: Users, titleKey: "sectionParties", contentKey: "sectionPartiesContent" },
  { icon: ScrollText, titleKey: "sectionTerms", contentKey: "sectionTermsContent" },
  { icon: Shield, titleKey: "sectionAuthority", contentKey: "sectionAuthorityContent" },
  { icon: AlertTriangle, titleKey: "sectionLegal", contentKey: "sectionLegalContent" },
];

export default function ContractsPage() {
  const t = useTranslations("contracts");

  const [accepted, setAccepted] = React.useState(false);

  function handleAccept() {
    setAccepted(true);
    toast.success(t("accepted"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSignature className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Current Contract */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              {t("currentContract")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {t("version")}: v1.0.0
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t("lastUpdated")}: 01.01.2025
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={section.titleKey}>
                {index > 0 && <Separator className="mb-6" />}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Icon className="h-5 w-5 text-primary" />
                    {t(section.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                    {t(section.contentKey)}
                  </p>
                </div>
              </div>
            );
          })}

          <Separator />

          <div className="flex justify-end">
            {accepted ? (
              <Button variant="outline" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                {t("accepted")}
              </Button>
            ) : (
              <Button onClick={handleAccept}>{t("acceptContract")}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contract History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("contractHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("historyVersion")}</TableHead>
                <TableHead>{t("historyDate")}</TableHead>
                <TableHead>{t("historyStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">v1.0.0</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  01.01.2025
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 border-green-300"
                  >
                    {t("accepted")}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
