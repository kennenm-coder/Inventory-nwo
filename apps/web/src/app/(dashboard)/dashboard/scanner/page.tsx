"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/scanner/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

interface Sheet {
  id: string;
  name: string;
  _count: { rows: number; fields: number };
}

interface Row {
  id: string;
  barcode: string | null;
  data: Record<string, unknown>;
}

interface Field {
  key: string;
  title: string;
  type: string;
}

export default function ScannerPage() {
  const router = useRouter();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{ barcode: string; found: boolean; row?: Row; fields?: Field[] } | null>(null);
  const [scanHistory, setScanHistory] = useState<{ barcode: string; time: Date; found: boolean }[]>([]);

  useEffect(() => {
    api.get<Sheet[]>("/sheets").then((data) => {
      setSheets(data);
      if (data.length > 0) setSelectedSheetId(data[0].id);
    }).catch(() => toast.error("Failed to load sheets"));
  }, []);

  async function handleScan(barcode: string) {
    if (!selectedSheetId) {
      toast.error("Select a sheet first");
      return;
    }

    try {
      const rows = await api.get<Row[]>(`/sheets/${selectedSheetId}/rows?barcode=${encodeURIComponent(barcode)}`);
      const fields = await api.get<Field[]>(`/sheets/${selectedSheetId}/fields`);

      if (rows.length > 0) {
        setLastScan({ barcode, found: true, row: rows[0], fields });
        setScanHistory((prev) => [{ barcode, time: new Date(), found: true }, ...prev.slice(0, 49)]);
        toast.success(`Found: ${barcode}`);
      } else {
        setLastScan({ barcode, found: false, fields });
        setScanHistory((prev) => [{ barcode, time: new Date(), found: false }, ...prev.slice(0, 49)]);
        toast.info(`Not found: ${barcode}`);
      }
    } catch {
      toast.error("Lookup failed");
    }
  }

  async function createRowFromScan() {
    if (!lastScan || !selectedSheetId) return;

    try {
      await api.post(`/sheets/${selectedSheetId}/rows`, {
        barcode: lastScan.barcode,
        data: {},
      });
      toast.success("Row created! Opening sheet...");
      router.push(`/dashboard/sheets/${selectedSheetId}`);
    } catch {
      toast.error("Failed to create row");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Barcode Scanner</h1>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Target Sheet</label>
        <Select
          value={selectedSheetId}
          onChange={(e) => setSelectedSheetId(e.target.value)}
          className="max-w-xs"
        >
          <option value="">Select a sheet...</option>
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s._count.rows} rows)</option>
          ))}
        </Select>
      </div>

      <BarcodeScanner
        onScan={handleScan}
        scanning={scanning}
        onToggleScanning={setScanning}
      />

      {lastScan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Scan Result
              <Badge variant={lastScan.found ? "default" : "outline"}>
                {lastScan.found ? "Found" : "Not Found"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-lg mb-3">{lastScan.barcode}</p>

            {lastScan.found && lastScan.row ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {lastScan.fields?.map((f) => (
                    <div key={f.key}>
                      <span className="text-muted-foreground">{f.title}: </span>
                      <span>{String(lastScan.row!.data[f.key] ?? "-")}</span>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/sheets/${selectedSheetId}`)}
                >
                  Open in Sheet
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This barcode doesn&apos;t exist in the selected sheet.
                </p>
                <Button onClick={createRowFromScan}>
                  Create New Row with This Barcode
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm max-h-60 overflow-y-auto">
              {scanHistory.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <Badge variant={entry.found ? "default" : "outline"} className="text-xs">
                    {entry.found ? "Found" : "New"}
                  </Badge>
                  <span className="font-mono">{entry.barcode}</span>
                  <span className="text-muted-foreground ml-auto">
                    {entry.time.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
