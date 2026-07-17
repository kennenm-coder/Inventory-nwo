import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, FlatList, Platform } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { api } from "../../lib/api";
import { RootStackParamList, Sheet, Row, Field } from "../../lib/types";

export default function ScannerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanHistory, setScanHistory] = useState<Array<{ barcode: string; found: boolean; time: Date }>>([]);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    api.get<Sheet[]>("/sheets").then((data) => {
      setSheets(data);
      if (data.length > 0) setSelectedSheetId(data[0].id);
    }).catch(() => {});
  }, []);

  const handleBarcode = useCallback(async (barcode: string) => {
    if (!selectedSheetId) {
      Alert.alert("Select a Sheet", "Choose a sheet before scanning.");
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const rows = await api.get<Row[]>(`/sheets/${selectedSheetId}/rows?barcode=${encodeURIComponent(barcode)}`);
      const sheet = sheets.find((s) => s.id === selectedSheetId);
      const sheetName = sheet?.name || "Sheet";

      if (rows.length > 0) {
        setScanHistory((prev) => [{ barcode, found: true, time: new Date() }, ...prev.slice(0, 49)]);
        setScanning(false);
        navigation.navigate("RowDetail", { sheetId: selectedSheetId, rowId: rows[0].id, sheetName });
      } else {
        setScanHistory((prev) => [{ barcode, found: false, time: new Date() }, ...prev.slice(0, 49)]);
        Alert.alert(
          "Not Found",
          `Barcode "${barcode}" not found. Create a new item?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Create",
              onPress: () => {
                setScanning(false);
                navigation.navigate("RowCreate", { sheetId: selectedSheetId, sheetName, barcode });
              },
            },
          ],
        );
      }
    } catch {
      Alert.alert("Error", "Failed to look up barcode");
    }
  }, [selectedSheetId, sheets, navigation]);

  function onBarcodeScanned(result: BarcodeScanningResult) {
    const now = Date.now();
    if (result.data === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
    lastScanRef.current = result.data;
    lastScanTimeRef.current = now;
    handleBarcode(result.data);
  }

  if (!permission) return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is needed to scan barcodes</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sheet selector */}
      <View style={styles.sheetSelector}>
        <Text style={styles.selectorLabel}>Sheet:</Text>
        <FlatList
          horizontal
          data={sheets}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.sheetChip, item.id === selectedSheetId && styles.sheetChipActive]}
              onPress={() => setSelectedSheetId(item.id)}
            >
              <Text style={[styles.sheetChipText, item.id === selectedSheetId && styles.sheetChipTextActive]}>
                {item.icon || "📋"} {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Camera */}
      {scanning ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={facing}
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "itf14", "codabar", "datamatrix", "pdf417", "aztec"] }}
            onBarcodeScanned={onBarcodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setTorch(!torch)}>
              <Text style={styles.controlText}>{torch ? "🔦 Off" : "🔦 On"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setFacing(facing === "back" ? "front" : "back")}>
              <Text style={styles.controlText}>🔄 Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={() => setScanning(false)}>
              <Text style={styles.controlText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.startContainer}>
          <TouchableOpacity style={styles.scanButton} onPress={() => setScanning(true)}>
            <Text style={styles.scanButtonText}>📷 Start Scanning</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual entry */}
      <View style={styles.manualEntry}>
        <TextInput
          style={styles.manualInput}
          placeholder="Type or paste barcode..."
          value={manualBarcode}
          onChangeText={setManualBarcode}
          onSubmitEditing={() => { if (manualBarcode.trim()) { handleBarcode(manualBarcode.trim()); setManualBarcode(""); } }}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.lookupBtn, !manualBarcode.trim() && styles.lookupBtnDisabled]}
          disabled={!manualBarcode.trim()}
          onPress={() => { handleBarcode(manualBarcode.trim()); setManualBarcode(""); }}
        >
          <Text style={styles.lookupBtnText}>Lookup</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      {scanHistory.length > 0 && (
        <FlatList
          data={scanHistory}
          keyExtractor={(_, i) => String(i)}
          style={styles.history}
          renderItem={({ item }) => (
            <View style={styles.historyRow}>
              <View style={[styles.historyBadge, item.found ? styles.badgeFound : styles.badgeNew]}>
                <Text style={styles.badgeText}>{item.found ? "Found" : "New"}</Text>
              </View>
              <Text style={styles.historyBarcode}>{item.barcode}</Text>
              <Text style={styles.historyTime}>{item.time.toLocaleTimeString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  permissionText: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 16 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sheetSelector: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  selectorLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginRight: 8 },
  sheetChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f4f6", marginRight: 8 },
  sheetChipActive: { backgroundColor: "#2563eb" },
  sheetChipText: { fontSize: 13, color: "#374151" },
  sheetChipTextActive: { color: "#fff", fontWeight: "600" },
  cameraContainer: { height: 300, position: "relative" },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanFrame: { width: 250, height: 120, borderWidth: 2, borderColor: "#2563eb", borderRadius: 12 },
  cameraControls: { flexDirection: "row", justifyContent: "center", gap: 12, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.6)" },
  controlBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  stopBtn: { backgroundColor: "rgba(239,68,68,0.8)" },
  controlText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  startContainer: { padding: 20, alignItems: "center" },
  scanButton: { backgroundColor: "#2563eb", borderRadius: 12, paddingHorizontal: 32, paddingVertical: 16 },
  scanButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  manualEntry: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  manualInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  lookupBtn: { backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  lookupBtnDisabled: { opacity: 0.5 },
  lookupBtnText: { color: "#fff", fontWeight: "600" },
  history: { flex: 1, paddingHorizontal: 12 },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  badgeFound: { backgroundColor: "#dcfce7" },
  badgeNew: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  historyBarcode: { flex: 1, fontSize: 14, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  historyTime: { fontSize: 12, color: "#9ca3af" },
});
