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
    <Component
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      submitted={submitted}
      errors={errors}
    />
  );
}
