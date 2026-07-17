import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  organizationName: z.string().min(1).max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createSheetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(10).optional(),
});

export const updateSheetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(10).optional(),
});

const fieldTypeEnum = z.enum([
  "text", "number", "number_auto_increase", "number_auto_decrease",
  "email", "currency", "url", "barcode", "date", "date_automatic",
  "date_time", "date_time_automatic", "time", "drop_down", "true_false",
  "photo", "attachment", "signature", "gps_location", "gps_location_automatic",
  "formula", "unique_id", "created_by", "created_date",
  "last_modified_by", "last_modified_date",
]);

const fieldSettingsSchema = z.object({
  default_value: z.string().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  required: z.boolean().optional(),
  read_only_mobile: z.boolean().optional(),
  read_only_web: z.boolean().optional(),
  hidden_mobile: z.boolean().optional(),
  hidden_web: z.boolean().optional(),
  show_in_mobile_list: z.boolean().optional(),
  searchable_mobile: z.boolean().optional(),
  empty_on_scan: z.boolean().optional(),
  empty_on_edit: z.boolean().optional(),
  auto_focus: z.boolean().optional(),
  auto_select_value: z.boolean().optional(),
  min_length: z.number().nullable().optional(),
  max_length: z.number().nullable().optional(),
  locked: z.boolean().optional(),
  currency_code: z.string().optional(),
  dropdown_options: z.array(z.string()).optional(),
  formula: z.string().optional(),
}).passthrough();

export const createFieldSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, "Key must be lowercase alphanumeric with underscores"),
  title: z.string().min(1).max(255),
  type: fieldTypeEnum,
  position: z.number().int().min(0).optional(),
  settings: fieldSettingsSchema.optional(),
});

export const updateFieldSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type: fieldTypeEnum.optional(),
  position: z.number().int().min(0).optional(),
  settings: fieldSettingsSchema.optional(),
});

export const createRowSchema = z.object({
  barcode: z.string().max(500).optional(),
  data: z.record(z.unknown()),
});

export const updateRowSchema = z.object({
  barcode: z.string().max(500).optional(),
  data: z.record(z.unknown()),
});

export const batchCreateRowsSchema = z.object({
  rows: z.array(createRowSchema).min(1).max(1000),
});

export const batchUpdateRowsSchema = z.object({
  rows: z.array(z.object({
    id: z.string().uuid(),
    barcode: z.string().max(500).optional(),
    data: z.record(z.unknown()),
  })).min(1).max(1000),
});

export const batchDeleteRowsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
});

export const sheetUserSchema = z.object({
  userId: z.string().uuid(),
  permissions: z.object({
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
    canExport: z.boolean(),
    canAdmin: z.boolean(),
  }),
});
