"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { FIELD_TYPES } from "@scanvault/shared";

interface AddColumnDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (field: { key: string; title: string; type: string; settings?: Record<string, unknown> }) => void;
}

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  number_auto_increase: "Number (Auto +1)",
  number_auto_decrease: "Number (Auto -1)",
  email: "Email",
  currency: "Currency",
  url: "URL",
  barcode: "Barcode",
  date: "Date",
  date_automatic: "Date (Auto)",
  date_time: "Date & Time",
  date_time_automatic: "Date & Time (Auto)",
  time: "Time",
  drop_down: "Dropdown",
  true_false: "Yes / No",
  photo: "Photo",
  attachment: "Attachment",
  signature: "Signature",
  gps_location: "GPS Location",
  gps_location_automatic: "GPS (Auto)",
  formula: "Formula",
  unique_id: "Unique ID",
  created_by: "Created By",
  created_date: "Created Date",
  last_modified_by: "Last Modified By",
  last_modified_date: "Last Modified Date",
};

export function AddColumnDialog({ open, onClose, onAdd }: AddColumnDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("text");
  const [dropdownOptions, setDropdownOptions] = useState("");

  function handleSubmit() {
    if (!title.trim()) return;
    const key = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const settings: Record<string, unknown> = {};
    if (type === "drop_down" && dropdownOptions.trim()) {
      settings.dropdown_options = dropdownOptions.split(",").map((s) => s.trim()).filter(Boolean);
    }
    onAdd({ key, title: title.trim(), type, settings });
    setTitle("");
    setType("text");
    setDropdownOptions("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Add Column</DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-4">
        <div className="space-y-2">
          <Label>Column Name</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Item Name" autoFocus />
        </div>
        <div className="space-y-2">
          <Label>Field Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </Select>
        </div>
        {type === "drop_down" && (
          <div className="space-y-2">
            <Label>Options (comma separated)</Label>
            <Input value={dropdownOptions} onChange={(e) => setDropdownOptions(e.target.value)} placeholder="Option A, Option B, Option C" />
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!title.trim()}>Add Column</Button>
      </DialogFooter>
    </Dialog>
  );
}
