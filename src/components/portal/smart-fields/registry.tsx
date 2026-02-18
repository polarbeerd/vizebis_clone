"use client";

import type { ComponentType } from "react";
import { Nationality } from "./nationality";
import { TravelDates } from "./travel-dates";
import { BirthPlace } from "./birth-place";
import { AddressInfo } from "./address-info";
import { EmploymentStatus } from "./employment-status";
import { PassportCountry } from "./passport-country";
import { FingerprintVisa } from "./fingerprint-visa";

/**
 * Props every smart field component receives.
 * Each smart field manages its own internal state structure.
 */
export interface SmartFieldProps {
  /** Current value — shape depends on the specific smart field */
  value: Record<string, unknown>;
  /** Callback to update the value */
  onChange: (value: Record<string, unknown>) => void;
  /** Whether this smart field is required for submission */
  isRequired: boolean;
  /** Whether the parent form has been submitted (triggers error display) */
  submitted?: boolean;
  /** Validation errors to display (set externally by parent form) */
  errors?: string[];
}

/**
 * Registry mapping template_key → React component.
 */
export type SmartFieldRegistry = Record<
  string,
  ComponentType<SmartFieldProps>
>;

export const SMART_FIELD_REGISTRY: SmartFieldRegistry = {
  nationality: Nationality,
  travel_dates: TravelDates,
  birth_place: BirthPlace,
  address_info: AddressInfo,
  employment_status: EmploymentStatus,
  passport_country: PassportCountry,
  fingerprint_visa: FingerprintVisa,
};

/**
 * Check if a template_key has a registered component.
 */
export function hasSmartFieldComponent(templateKey: string): boolean {
  return templateKey in SMART_FIELD_REGISTRY;
}
