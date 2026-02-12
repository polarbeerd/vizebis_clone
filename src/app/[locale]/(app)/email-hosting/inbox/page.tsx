"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mail,
  MailOpen,
  Trash2,
  Search,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import Link from "next/link";

interface EmailItem {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  date: string;
  isRead: boolean;
}

export default function EmailInboxPage() {
  const t = useTranslations("emailHosting");
  const [emails] = React.useState<EmailItem[]>([]);
  const [search, setSearch] = React.useState("");

  const filteredEmails = emails.filter(
    (e) =>
      e.sender.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/email-hosting">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("inboxTitle")}
            </h1>
            <p className="text-muted-foreground">{t("inboxSubtitle")}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchEmails")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            {t("inbox")}
            {emails.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {emails.filter((e) => !e.isRead).length} {t("unread")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {t("noEmails")}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-muted/50 cursor-pointer ${
                    !email.isRead ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="shrink-0">
                    {email.isRead ? (
                      <MailOpen className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Mail className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${
                          !email.isRead ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {email.sender}
                      </span>
                      {!email.isRead && (
                        <Badge
                          variant="default"
                          className="h-5 text-xs px-1.5"
                        >
                          {t("new")}
                        </Badge>
                      )}
                    </div>
                    <p
                      className={`text-sm truncate ${
                        !email.isRead
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {email.preview}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {email.date}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
