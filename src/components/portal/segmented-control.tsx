"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  /** Unique layoutId for framer-motion shared layout animation */
  layoutId: string;
  size?: "sm" | "md";
  /** If true, segments stretch to fill container width equally */
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  layoutId,
  size = "md",
  fullWidth = false,
  className = "",
}: SegmentedControlProps) {
  // Use grid layout for 4+ options on mobile to avoid overflow
  const useGrid = fullWidth && options.length >= 4;
  // Stack vertically on mobile when labels are long or there are 3+ options
  const shouldStackMobile =
    options.length >= 3 ||
    options.some((opt) => opt.label.length > 15);

  return (
    <div
      className={`rounded-xl border border-slate-200/60 bg-slate-100/80 p-1 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/80 ${
        useGrid
          ? "grid grid-cols-2 sm:flex sm:items-center"
          : shouldStackMobile
            ? "flex flex-col gap-0.5 sm:inline-flex sm:flex-row sm:items-center"
            : `inline-flex items-center ${fullWidth ? "w-full" : ""}`
      } ${fullWidth && shouldStackMobile ? "w-full sm:w-auto" : ""} ${className}`}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 ${
              size === "sm"
                ? "px-3 py-1.5 text-xs"
                : "px-4 py-2 text-sm"
            } ${fullWidth || useGrid ? "flex-1" : ""} ${
              useGrid ? "min-w-0" : ""
            } ${shouldStackMobile ? "w-full sm:w-auto" : ""} ${
              !isActive
                ? "hover:bg-slate-200/60 dark:hover:bg-slate-700/40"
                : ""
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-[#FEBEBF] shadow-md shadow-[#FEBEBF]/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {opt.icon && <span className="relative">{opt.icon}</span>}
            <span
              className={`relative ${
                shouldStackMobile
                  ? "whitespace-normal text-center leading-tight sm:truncate sm:text-left"
                  : "truncate"
              } ${
                isActive
                  ? "text-slate-800 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
