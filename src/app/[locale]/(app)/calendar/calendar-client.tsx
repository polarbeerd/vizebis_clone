"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CalendarAppointment } from "./page";

interface CalendarClientProps {
  appointments: CalendarAppointment[];
}

export function CalendarClient({ appointments }: CalendarClientProps) {
  const t = useTranslations("calendar");

  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const monthNames = t("monthNames").split(",");
  const dayNames = t("dayNames").split(",");

  // Build calendar grid days
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Week starts on Monday (weekStartsOn: 1)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Group appointments by date string (YYYY-MM-DD)
  const appointmentsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appt of appointments) {
      if (!appt.appointment_date) continue;
      const dateKey = appt.appointment_date.slice(0, 10); // YYYY-MM-DD
      const existing = map.get(dateKey) ?? [];
      existing.push(appt);
      map.set(dateKey, existing);
    }
    return map;
  }, [appointments]);

  // Get appointments for selected date
  const selectedDateAppointments = React.useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return appointmentsByDate.get(dateKey) ?? [];
  }, [selectedDate, appointmentsByDate]);

  function handlePrevMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1));
    setSelectedDate(null);
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1));
    setSelectedDate(null);
  }

  function handleGoToToday() {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }

  function handleDayClick(day: Date) {
    setSelectedDate(day);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGoToToday}>
            <CalendarDays className="mr-1 size-4" />
            {t("today")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar Grid */}
        <div className="rounded-lg border bg-card">
          {/* Month Navigation */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="size-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {monthNames[currentMonth.getMonth()]}{" "}
              {currentMonth.getFullYear()}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="size-5" />
            </Button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b">
            {dayNames.map((dayName) => (
              <div
                key={dayName}
                className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayAppts = appointmentsByDate.get(dateKey) ?? [];
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate
                ? isSameDay(day, selectedDate)
                : false;
              const todayFlag = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 border-b border-r p-2 min-h-[80px] text-sm transition-colors hover:bg-accent/50",
                    !inCurrentMonth && "text-muted-foreground/40 bg-muted/20",
                    isSelected && "bg-accent ring-2 ring-primary ring-inset",
                    todayFlag && !isSelected && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-sm font-medium",
                      todayFlag &&
                        "bg-primary text-primary-foreground",
                      isSelected &&
                        !todayFlag &&
                        "bg-accent-foreground/10"
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Appointment dots/badges */}
                  {dayAppts.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5 mt-auto">
                      {dayAppts.length <= 3 ? (
                        dayAppts.map((appt) => (
                          <div
                            key={appt.id}
                            className="size-1.5 rounded-full bg-primary"
                            title={appt.full_name ?? ""}
                          />
                        ))
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {dayAppts.length}
                        </Badge>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Selected Day Appointments */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">
              {t("appointmentsForDay")}
              {selectedDate && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {format(selectedDate, "dd.MM.yyyy")}
                </span>
              )}
            </h3>
          </div>
          <div className="p-4">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">
                {t("noAppointments")}
              </p>
            ) : selectedDateAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noAppointments")}
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <div className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {appt.full_name ?? "-"}
                      </p>
                      {appt.country && (
                        <p className="text-xs text-muted-foreground">
                          {appt.country}
                        </p>
                      )}
                      {appt.appointment_date && (
                        <p className="text-xs text-muted-foreground">
                          {appt.appointment_date}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
