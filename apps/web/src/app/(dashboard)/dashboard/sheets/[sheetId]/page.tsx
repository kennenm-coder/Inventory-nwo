"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldCell } from "@/components/sheet/field-cell";
import { AddColumnDialog } from "@/components/sheet/add-column-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { READ_ONLY_FIELD_TYPES } from "@scanvault/shared";

interface Field {
  id: string;
  key: string;
  title: string;
  type: string;
  position: number;
  settings: Record<string, unknown>;
}

interface Row {
  id: string;
  barcode: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: { id: string; name: string };
  lastModifiedBy: { id: string; name: string };
}

interface SheetData {
  id: string;
  name: string;
  fields: Field[];
  _count: { rows: number };
}

export default function SheetPage() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowId: string; fieldKey: string } | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sheetData, rowsData] = await Promise.all([
        api.get<SheetData>(`/sheets/${sheetId}`),
        api.get<Row[]>(`/sheets/${sheetId}/rows`),
      ]);
      setSheet(sheetData);
      setRows(rowsData);
    } catch {
      toast.error("Failed to load sheet");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [sheetId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateCell(rowId: string, fieldKey: string, value: unknown) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const newData = { ...row.data, [fieldKey]: value };

    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, data: newData } : r)),
    );
    setEditingCell(null);

    try {
      await api.put(`/sheets/${sheetId}/rows/${rowId}?partial=true`, { data: { [fieldKey]: value } });
    } catch {
      toast.error("Failed to save");
      loadData();
    }
  }

  async function addRow() {
    try {
      const emptyData: Record<string, unknown> = {};
      sheet?.fields.forEach((f) => {
        if (f.type === "date_automatic" || f.type === "date_time_automatic") {
          emptyData[f.key] = new Date().toISOString();
        }
      });
      await api.post(`/sheets/${sheetId}/rows`, { data: emptyData });
      loadData();
    } catch {
      toast.error("Failed to add row");
    }
  }

  async function deleteRow(rowId: string) {
    try {
      await api.delete(`/sheets/${sheetId}/rows/${rowId}`);
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      toast.success("Row deleted");
    } catch {
      toast.error("Failed to delete row");
    }
  }

  async function addColumn(field: { key: string; title: string; type: string; settings?: Record<string, unknown> }) {
    try {
      await api.post(`/sheets/${sheetId}/fields`, field);
      loadData();
      toast.success("Column added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add column");
    }
  }

  async function deleteColumn(fieldKey: string) {
    if (!confirm("Delete this column? Data in this column will be lost.")) return;
    try {
      await api.delete(`/sheets/${sheetId}/fields/${fieldKey}`);
      loadData();
      toast.success("Column deleted");
    } catch {
      toast.error("Failed to delete column");
    }
  }

  const columns: ColumnDef<Row>[] = [
    {
      id: "barcode",
      header: "Barcode",
      size: 140,
      cell: ({ row: tableRow }) => {
        const row = tableRow.original;
        const isEditing = editingCell?.rowId === row.id && editingCell?.fieldKey === "__barcode";
        return (
          <FieldCell
            type="barcode"
            value={row.barcode}
            settings={{}}
            editing={isEditing}
            onStartEdit={() => setEditingCell({ rowId: row.id, fieldKey: "__barcode" })}
            onSave={async (val) => {
              setEditingCell(null);
              try {
                await api.put(`/sheets/${sheetId}/rows/${row.id}?partial=true`, { barcode: String(val || ""), data: row.data });
                loadData();
              } catch { toast.error("Failed to save"); }
            }}
          />
        );
      },
    },
    ...(sheet?.fields.map((field): ColumnDef<Row> => ({
      id: field.key,
      header: () => (
        <div className="flex items-center justify-between group">
          <span className="truncate">{field.title}</span>
          <button
            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 text-xs px-1"
            onClick={() => deleteColumn(field.key)}
          >
            x
          </button>
        </div>
      ),
      size: 160,
      cell: ({ row: tableRow }) => {
        const row = tableRow.original;
        const isEditing = editingCell?.rowId === row.id && editingCell?.fieldKey === field.key;
        const isReadOnly = (READ_ONLY_FIELD_TYPES as readonly string[]).includes(field.type);
        return (
          <FieldCell
            type={field.type}
            value={row.data[field.key]}
            settings={field.settings}
            editing={isEditing}
            onStartEdit={() => setEditingCell({ rowId: row.id, fieldKey: field.key })}
            onSave={(val) => updateCell(row.id, field.key, val)}
            readOnly={isReadOnly}
          />
        );
      },
    })) || []),
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row: tableRow }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive text-xs"
          onClick={() => deleteRow(tableRow.original.id)}
        >
          Delete
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading || !sheet) {
    return <div className="max-w-7xl mx-auto p-6"><p className="text-muted-foreground">Loading sheet...</p></div>;
  }

  return (
    <div className="max-w-full mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            &larr; Back
          </Button>
          <h1 className="text-xl font-bold">{sheet.name}</h1>
          <span className="text-sm text-muted-foreground">{rows.length} rows</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddColumnOpen(true)}>
            + Column
          </Button>
          <Button size="sm" onClick={addRow}>
            + Row
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left font-medium px-2 py-2 border-r last:border-r-0"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  No rows yet. Click &quot;+ Row&quot; to add your first item.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-r last:border-r-0 p-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddColumnDialog open={addColumnOpen} onClose={() => setAddColumnOpen(false)} onAdd={addColumn} />
    </div>
  );
}
