"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

interface Sheet {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { rows: number; fields: number };
  createdBy: { name: string };
}

export default function DashboardPage() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function loadSheets() {
    try {
      const data = await api.get<Sheet[]>("/sheets");
      setSheets(data);
    } catch (err) {
      toast.error("Failed to load sheets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSheets(); }, []);

  async function createSheet() {
    if (!newName.trim()) return;
    try {
      await api.post("/sheets", { name: newName.trim() });
      setNewName("");
      setCreating(false);
      loadSheets();
      toast.success("Sheet created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sheet");
    }
  }

  async function deleteSheet(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/sheets/${id}`);
      loadSheets();
      toast.success("Sheet deleted");
    } catch (err) {
      toast.error("Failed to delete sheet");
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-muted-foreground">Loading sheets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventory Sheets</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>New Sheet</Button>
        )}
      </div>

      {creating && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <form
              onSubmit={(e) => { e.preventDefault(); createSheet(); }}
              className="flex gap-2"
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Sheet name..."
                autoFocus
              />
              <Button type="submit">Create</Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setNewName(""); }}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {sheets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No sheets yet. Create your first inventory sheet to get started.</p>
            {!creating && <Button onClick={() => setCreating(true)}>Create Sheet</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <Link key={sheet.id} href={`/dashboard/sheets/${sheet.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {sheet.icon && <span className="mr-1">{sheet.icon}</span>}
                        {sheet.name}
                      </h3>
                      {sheet.description && (
                        <p className="text-sm text-muted-foreground mt-1">{sheet.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {sheet._count.rows} rows &middot; {sheet._count.fields} fields
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteSheet(sheet.id, sheet.name);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
