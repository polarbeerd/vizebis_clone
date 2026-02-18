"use client";

import * as React from "react";
import { SMART_FIELD_REGISTRY } from "./registry";

interface SmartFieldRendererProps {
  templateKey: string;
  label: string;
  description: string;
  isRequired: boolean;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  submitted?: boolean;
  errors?: string[];
}

/**
 * Renders the smart field component for a given template_key.
 * If no component is registered, renders nothing (future-proof).
 */
export function SmartFieldRenderer({
  templateKey,
  label,
  description,
  isRequired,
  value,
  onChange,
  submitted,
  errors,
}: SmartFieldRendererProps) {
  const Component = SMART_FIELD_REGISTRY[templateKey];

  if (!Component) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-sm font-medium">
          {label}
          {isRequired && <span className="ml-1 text-destructive">*</span>}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Component
        value={value}
        onChange={onChange}
        isRequired={isRequired}
        submitted={submitted}
        errors={errors}
      />
    </div>
  );
}
