"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid, isBefore, startOfDay } from "date-fns";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Helpers ──────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function daysInMonth(month: number, year: number) {
  if (month < 1 || month > 12 || year < 1) return 31;
  return new Date(year, month, 0).getDate();
}

/** Parse "yyyy-MM-dd" → { day, month, year } strings, or empty */
function parseIsoValue(iso: string): { day: string; month: string; year: string } {
  if (!iso) return { day: "", month: "", year: "" };
  const parts = iso.split("-");
  if (parts.length !== 3) return { day: "", month: "", year: "" };
  return {
    year: parts[0],
    month: parts[1].replace(/^0/, ""),
    day: parts[2].replace(/^0/, ""),
  };
}

/** Build "yyyy-MM-dd" from numeric parts (returns "" if incomplete) */
function toIso(day: number, month: number, year: number): string {
  if (!day || !month || !year || year < 1000) return "";
  const d = String(day).padStart(2, "0");
  const m = String(month).padStart(2, "0");
  const y = String(year).padStart(4, "0");
  return `${y}-${m}-${d}`;
}

// ── Component ────────────────────────────────────────────────────

export interface DatePickerInputProps {
  /** Value in "yyyy-MM-dd" format */
  value: string;
  /** Called with "yyyy-MM-dd" or "" */
  onChange: (value: string) => void;
  /** Minimum selectable date in "yyyy-MM-dd" — dates before are grayed out */
  minDate?: string;
  /** Extra class names on the outer wrapper */
  className?: string;
  /** aria-invalid for error styling */
  "aria-invalid"?: boolean;
  /** Disable the entire input */
  disabled?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  minDate,
  className,
  "aria-invalid": ariaInvalid,
  disabled,
}: DatePickerInputProps) {
  const parsed = parseIsoValue(value);

  const [dayStr, setDayStr] = React.useState(parsed.day);
  const [monthStr, setMonthStr] = React.useState(parsed.month);
  const [yearStr, setYearStr] = React.useState(parsed.year);
  const [open, setOpen] = React.useState(false);

  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);

  // Sync internal state when external value changes (e.g. calendar pick)
  React.useEffect(() => {
    const p = parseIsoValue(value);
    setDayStr(p.day);
    setMonthStr(p.month);
    setYearStr(p.year);
  }, [value]);

  // ── Emit onChange when all 3 segments are valid ──
  const emit = React.useCallback(
    (d: string, m: string, y: string) => {
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);

      if (!d || !m || !y || isNaN(day) || isNaN(month) || isNaN(year) || y.length < 4) {
        if (value) onChange("");
        return;
      }

      const clampedDay = clamp(day, 1, daysInMonth(month, year));
      const clampedMonth = clamp(month, 1, 12);
      const iso = toIso(clampedDay, clampedMonth, year);
      if (iso && iso !== value) {
        onChange(iso);
      }
    },
    [value, onChange]
  );

  // ── Segment handlers ──

  function handleDayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDayStr(raw);

    // Auto-advance: if 2 digits entered, or single digit >= 4 (can't be 4x for days)
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw, 10) >= 4)) {
      monthRef.current?.focus();
      monthRef.current?.select();
    }
    emit(raw, monthStr, yearStr);
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMonthStr(raw);

    // Auto-advance: if 2 digits entered, or single digit >= 2 (can't be 2x for months > 12)
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw, 10) >= 2)) {
      yearRef.current?.focus();
      yearRef.current?.select();
    }
    emit(dayStr, raw, yearStr);
  }

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYearStr(raw);
    emit(dayStr, monthStr, raw);
  }

  // ── Keyboard: Backspace on empty jumps back ──
  function handleDayKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "/" || e.key === "-" || e.key === ".") {
      e.preventDefault();
      monthRef.current?.focus();
      monthRef.current?.select();
    }
  }

  function handleMonthKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && monthStr === "") {
      e.preventDefault();
      dayRef.current?.focus();
    }
    if (e.key === "/" || e.key === "-" || e.key === ".") {
      e.preventDefault();
      yearRef.current?.focus();
      yearRef.current?.select();
    }
  }

  function handleYearKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && yearStr === "") {
      e.preventDefault();
      monthRef.current?.focus();
    }
  }

  // ── Calendar selection ──
  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      const iso = format(date, "yyyy-MM-dd");
      onChange(iso);
    }
    setOpen(false);
  }

  // ── Calendar props ──
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const disabledMatcher = React.useMemo(() => {
    if (!minDate) return undefined;
    const min = parse(minDate, "yyyy-MM-dd", new Date());
    if (!isValid(min)) return undefined;
    return (date: Date) => isBefore(date, startOfDay(min));
  }, [minDate]);

  return (
    <div
      className={cn(
        "border-input dark:bg-input/30 flex h-11 w-full items-center rounded-xl border bg-transparent shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        ariaInvalid &&
          "ring-destructive/20 dark:ring-destructive/40 border-destructive",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Segmented input area */}
      <div className="flex flex-1 items-center gap-0 px-3">
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          value={dayStr}
          onChange={handleDayChange}
          onKeyDown={handleDayKeyDown}
          onFocus={(e) => e.target.select()}
          placeholder="DD"
          disabled={disabled}
          className="w-7 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Day"
        />
        <span className="text-muted-foreground text-sm select-none">/</span>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          value={monthStr}
          onChange={handleMonthChange}
          onKeyDown={handleMonthKeyDown}
          onFocus={(e) => e.target.select()}
          placeholder="MM"
          disabled={disabled}
          className="w-8 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Month"
        />
        <span className="text-muted-foreground text-sm select-none">/</span>
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          value={yearStr}
          onChange={handleYearChange}
          onKeyDown={handleYearKeyDown}
          onFocus={(e) => e.target.select()}
          placeholder="YYYY"
          disabled={disabled}
          className="w-11 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Year"
        />
      </div>

      {/* Calendar trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-full items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors",
              "hover:text-foreground hover:bg-accent"
            )}
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            disabled={disabledMatcher}
            defaultMonth={selectedDate ?? (minDate ? parse(minDate, "yyyy-MM-dd", new Date()) : undefined)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
