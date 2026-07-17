export type UserRole = "owner" | "admin" | "member";
export type OrgPlan = "free" | "starter" | "business" | "enterprise";

export type FieldType =
  | "text"
  | "number"
  | "number_auto_increase"
  | "number_auto_decrease"
  | "email"
  | "currency"
  | "url"
  | "barcode"
  | "date"
  | "date_automatic"
  | "date_time"
  | "date_time_automatic"
  | "time"
  | "drop_down"
  | "true_false"
  | "photo"
  | "attachment"
  | "signature"
  | "gps_location"
  | "gps_location_automatic"
  | "formula"
  | "unique_id"
  | "created_by"
  | "created_date"
  | "last_modified_by"
  | "last_modified_date";

export type AuditAction =
  | "row_created"
  | "row_updated"
  | "row_deleted"
  | "field_added"
  | "field_updated"
  | "field_deleted"
  | "sheet_cleared"
  | "sheet_deleted"
  | "import"
  | "export";

export interface FieldSettings {
  default_value?: string | null;
  placeholder?: string | null;
  required?: boolean;
  read_only_mobile?: boolean;
  read_only_web?: boolean;
  hidden_mobile?: boolean;
  hidden_web?: boolean;
  show_in_mobile_list?: boolean;
  searchable_mobile?: boolean;
  empty_on_scan?: boolean;
  empty_on_edit?: boolean;
  auto_focus?: boolean;
  auto_select_value?: boolean;
  min_length?: number | null;
  max_length?: number | null;
  locked?: boolean;
  currency_code?: string;
  dropdown_options?: string[];
  formula?: string;
}

export interface SheetPermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canAdmin: boolean;
}

export interface TriggerCondition {
  field_key: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "is_empty" | "is_not_empty";
  value: string;
}

export interface TriggerAction {
  type: "email" | "webhook" | "show_field" | "hide_field" | "require_field" | "set_field_value";
  config: Record<string, unknown>;
}
