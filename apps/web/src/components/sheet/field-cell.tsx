"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface FieldCellProps {
  type: string;
  value: unknown;
  settings: Record<string, unknown>;
  editing: boolean;
  onSave: (value: unknown) => void;
  onStartEdit: () => void;
  readOnly?: boolean;
}

export function FieldCell({ type, value, settings, editing, onSave, onStartEdit, readOnly }: FieldCellProps) {
  if (editing && !readOnly) {
    return <FieldEditor type={type} value={value} settings={settings} onSave={onSave} />;
  }

  return (
    <div
      className="px-2 py-1 min-h-[32px] flex items-center cursor-pointer hover:bg-accent/50 truncate"
      onClick={readOnly ? undefined : onStartEdit}
    >
      <FieldDisplay type={type} value={value} settings={settings} />
    </div>
  );
}

function FieldDisplay({ type, value, settings }: { type: string; value: unknown; settings: Record<string, unknown> }) {
  const str = value == null ? "" : String(value);

  switch (type) {
    case "text":
    case "barcode":
      return <span>{str}</span>;

    case "number":
    case "number_auto_increase":
    case "number_auto_decrease":
      return <span className="font-mono">{str}</span>;

    case "email":
      return str ? <a href={`mailto:${str}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{str}</a> : <span className="text-muted-foreground">-</span>;

    case "currency": {
      const code = (settings.currency_code as string) || "USD";
      const num = Number(value);
      if (isNaN(num)) return <span>-</span>;
      try {
        return <span className="font-mono">{new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(num)}</span>;
      } catch {
        return <span className="font-mono">{code} {num.toFixed(2)}</span>;
      }
    }

    case "url":
      return str ? <a href={str} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{str}</a> : <span className="text-muted-foreground">-</span>;

    case "date":
    case "date_automatic":
      return <span>{str ? new Date(str).toLocaleDateString() : "-"}</span>;

    case "date_time":
    case "date_time_automatic":
      return <span>{str ? new Date(str).toLocaleString() : "-"}</span>;

    case "time":
      return <span>{str || "-"}</span>;

    case "drop_down":
      return str ? <Badge variant="secondary">{str}</Badge> : <span className="text-muted-foreground">-</span>;

    case "true_false":
      return (
        <Badge variant={value === true || str === "true" || str === "YES" ? "default" : "outline"}>
          {value === true || str === "true" || str === "YES" ? "YES" : "NO"}
        </Badge>
      );

    case "photo":
      return str ? <img src={str} alt="" className="w-8 h-8 object-cover rounded" /> : <span className="text-muted-foreground">No photo</span>;

    case "attachment":
      return str ? <a href={str} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>View file</a> : <span className="text-muted-foreground">-</span>;

    case "signature":
      return str ? <img src={str} alt="Signature" className="h-8" /> : <span className="text-muted-foreground">-</span>;

    case "gps_location":
    case "gps_location_automatic":
      return str ? <span className="text-xs font-mono">{str}</span> : <span className="text-muted-foreground">-</span>;

    case "formula":
      return <span className="font-mono italic">{str || "-"}</span>;

    case "unique_id":
      return <span className="font-mono text-xs">{str}</span>;

    case "created_by":
    case "last_modified_by":
      return <span className="text-muted-foreground">{str || "-"}</span>;

    case "created_date":
    case "last_modified_date":
      return <span className="text-muted-foreground">{str ? new Date(str).toLocaleString() : "-"}</span>;

    default:
      return <span>{str}</span>;
  }
}

function FieldEditor({ type, value, settings, onSave }: { type: string; value: unknown; settings: Record<string, unknown>; onSave: (val: unknown) => void }) {
  const [val, setVal] = useState(value == null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    let parsed: unknown = val;
    if (type === "number" || type === "currency" || type === "number_auto_increase" || type === "number_auto_decrease") {
      parsed = val === "" ? null : Number(val);
    } else if (type === "true_false") {
      parsed = val === "true" || val === "YES";
    }
    onSave(parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") onSave(value);
  }

  switch (type) {
    case "drop_down": {
      const options = (settings.dropdown_options as string[]) || [];
      return (
        <Select
          value={val}
          onChange={(e) => { setVal(e.target.value); onSave(e.target.value); }}
          autoFocus
        >
          <option value="">Select...</option>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </Select>
      );
    }

    case "true_false":
      return (
        <div className="flex gap-1 p-1">
          <button className={`px-2 py-1 rounded text-xs font-medium ${val === "true" || val === "YES" ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => onSave(true)}>YES</button>
          <button className={`px-2 py-1 rounded text-xs font-medium ${val === "false" || val === "NO" || !val ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => onSave(false)}>NO</button>
        </div>
      );

    case "date":
    case "date_automatic":
      return <Input ref={inputRef} type="date" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown} className="h-8" />;

    case "date_time":
    case "date_time_automatic":
      return <Input ref={inputRef} type="datetime-local" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown} className="h-8" />;

    case "time":
      return <Input ref={inputRef} type="time" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown} className="h-8" />;

    case "number":
    case "number_auto_increase":
    case "number_auto_decrease":
    case "currency":
      return <Input ref={inputRef} type="number" step="any" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown} className="h-8 font-mono" />;

    case "email":
      return <Input ref={inputRef} type="email" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown} className="h-8" />;

    case "url":
      return <Input ref={inputRef} type="url" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown} className="h-8" placeholder="https://" />;

    default:
      return <Input ref={inputRef} type="text" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown} className="h-8" />;
  }
}
