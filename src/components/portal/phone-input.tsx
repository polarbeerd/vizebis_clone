"use client";

import * as React from "react";
import {
  usePhoneInput,
  FlagImage,
  defaultCountries,
  parseCountry,
} from "react-international-phone";
import "react-international-phone/style.css";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  placeholder,
  className,
  "aria-invalid": ariaInvalid,
}: PhoneInputProps) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } =
    usePhoneInput({
      defaultCountry: "tr",
      value,
      countries: defaultCountries,
      forceDialCode: true,
      onChange: (data) => {
        onChange(data.phone);
      },
    });

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center overflow-hidden rounded-xl border border-input bg-background ring-ring/10 transition-shadow focus-within:ring-[3px] focus-within:border-ring",
          ariaInvalid &&
            "border-destructive ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20",
          className
        )}
      >
        {/* Country selector button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex h-11 shrink-0 items-center gap-1 border-r border-input bg-muted/40 px-2.5 transition-colors hover:bg-muted/70"
        >
          <FlagImage
            iso2={country.iso2}
            style={{ width: 22, height: 16, borderRadius: 2 }}
          />
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {/* Phone number input */}
        <Input
          ref={inputRef}
          type="tel"
          value={inputValue}
          onChange={handlePhoneValueChange}
          placeholder={placeholder}
          className="h-11 border-0 shadow-none ring-0 focus-visible:ring-0 rounded-none"
        />
      </div>

      {/* Country dropdown */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {defaultCountries.map((c) => {
            const parsed = parseCountry(c);
            const isSelected = country.iso2 === parsed.iso2;
            return (
              <button
                key={parsed.iso2}
                type="button"
                onClick={() => {
                  setCountry(parsed.iso2);
                  setDropdownOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                  isSelected && "bg-brand-50 dark:bg-brand-950/30"
                )}
              >
                <FlagImage
                  iso2={parsed.iso2}
                  style={{ width: 22, height: 16, borderRadius: 2, flexShrink: 0 }}
                />
                <span className="truncate text-slate-700 dark:text-slate-300">
                  {parsed.name}
                </span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  +{parsed.dialCode}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
