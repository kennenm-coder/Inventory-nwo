import type { FieldType } from "../types";

export const FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "number_auto_increase",
  "number_auto_decrease",
  "email",
  "currency",
  "url",
  "barcode",
  "date",
  "date_automatic",
  "date_time",
  "date_time_automatic",
  "time",
  "drop_down",
  "true_false",
  "photo",
  "attachment",
  "signature",
  "gps_location",
  "gps_location_automatic",
  "formula",
  "unique_id",
  "created_by",
  "created_date",
  "last_modified_by",
  "last_modified_date",
];

export const SYSTEM_FIELD_TYPES: FieldType[] = [
  "created_by",
  "created_date",
  "last_modified_by",
  "last_modified_date",
];

export const READ_ONLY_FIELD_TYPES: FieldType[] = [
  ...SYSTEM_FIELD_TYPES,
  "formula",
  "unique_id",
];

export const PLAN_LIMITS = {
  free: { users: 1, rowsPerSheet: 50, sheets: 1, historyDays: 14, triggers: false, integrations: false, api: false, formulas: false, photos: false, branding: false },
  starter: { users: 2, rowsPerSheet: 1000, sheets: 5, historyDays: 180, triggers: true, integrations: false, api: false, formulas: false, photos: false, branding: false },
  business: { users: 2, rowsPerSheet: 20000, sheets: 20, historyDays: 365, triggers: true, integrations: true, api: true, formulas: true, photos: true, branding: true },
  enterprise: { users: Infinity, rowsPerSheet: Infinity, sheets: Infinity, historyDays: Infinity, triggers: true, integrations: true, api: true, formulas: true, photos: true, branding: true },
} as const;

export const WEBHOOK_EVENTS = [
  "rows:add",
  "rows:update",
  "rows:delete",
  "rows:import:append",
  "rows:import:replace",
  "columns:add",
  "columns:update",
  "columns:delete",
  "columns:clear",
  "sheet:clear",
  "sheet:delete",
  "sheet:settings:update",
  "*",
] as const;
