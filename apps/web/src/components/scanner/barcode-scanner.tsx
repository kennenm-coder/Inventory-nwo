"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  scanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
}

export function BarcodeScanner({ onScan, scanning, onToggleScanning }: BarcodeScannerProps) {
  const [manualBarcode, setManualBarcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;
    setError(null);

    try {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 3000) return;
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScan(decodedText);
        },
        () => {},
      );
    } catch (err) {
      setError("Could not access camera. Make sure you've granted camera permission.");
      onToggleScanning(false);
    }
  }, [onScan, onToggleScanning]);

  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [scanning, startScanner, stopScanner]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => onToggleScanning(!scanning)}
          variant={scanning ? "destructive" : "default"}
        >
          {scanning ? "Stop Scanner" : "Start Scanner"}
        </Button>
        <form onSubmit={handleManualSubmit} className="flex gap-2 flex-1">
          <Input
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Or type/paste a barcode..."
            className="max-w-xs"
          />
          <Button type="submit" variant="outline" disabled={!manualBarcode.trim()}>
            Lookup
          </Button>
        </form>
      </div>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {scanning && (
        <div className="relative rounded-lg overflow-hidden border bg-black max-w-lg">
          <div id="barcode-reader" ref={containerRef} />
        </div>
      )}
    </div>
  );
}
