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

  return (
    <div
      className={`rounded-xl border border-slate-200/60 bg-slate-100/80 p-1 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/80 ${
        useGrid
          ? "grid grid-cols-2 sm:flex sm:items-center"
          : `inline-flex items-center ${fullWidth ? "w-full" : ""}`
      } ${className}`}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 ${
              size === "sm"
                ? "px-3 py-1.5 text-xs"
                : "px-4 py-2 text-sm"
            } ${fullWidth || useGrid ? "flex-1" : ""} ${
              useGrid ? "min-w-0" : ""
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
              className={`relative truncate ${
                isActive
                  ? "text-slate-700"
                  : "text-slate-600 dark:text-slate-400"
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
