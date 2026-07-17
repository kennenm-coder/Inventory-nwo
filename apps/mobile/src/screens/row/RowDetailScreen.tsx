import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { api } from "../../lib/api";
import { addPendingChange } from "../../lib/db";
import { FieldInput } from "../../components/fields/FieldInput";
import { Row, Field, RootStackParamList } from "../../lib/types";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "RowDetail">;
  route: RouteProp<RootStackParamList, "RowDetail">;
};

export default function RowDetailScreen({ navigation, route }: Props) {
  const { sheetId, rowId } = route.params;
  const [row, setRow] = useState<Row | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [rowData, fieldsData] = await Promise.all([
        api.get<Row>(`/sheets/${sheetId}/rows/${rowId}`),
        api.get<Field[]>(`/sheets/${sheetId}/fields`),
      ]);
      setRow(rowData);
      setFields(fieldsData);
      setFormData(rowData.data);
      setBarcode(rowData.barcode || "");
    } catch {
      Alert.alert("Error", "Failed to load item");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [sheetId, rowId, navigation]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateField(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await api.put(`/sheets/${sheetId}/rows/${rowId}?partial=true`, { barcode, data: formData });
      setDirty(false);
      Alert.alert("Saved", "Item updated successfully");
      navigation.goBack();
    } catch {
      await addPendingChange(sheetId, rowId, "update_row", { barcode, data: formData });
      Alert.alert("Saved Offline", "Changes saved locally and will sync when connected.");
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow() {
    Alert.alert("Delete Item", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/sheets/${sheetId}/rows/${rowId}`);
          } catch {
            await addPendingChange(sheetId, rowId, "delete_row", {});
          }
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Barcode */}
        <View style={styles.barcodeSection}>
          <Text style={styles.barcodeLabel}>Barcode</Text>
          <Text style={styles.barcodeValue}>{barcode || "No barcode"}</Text>
        </View>

        {/* Fields */}
        {fields
          .sort((a, b) => a.position - b.position)
          .map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={formData[field.key]}
              onChange={(val) => updateField(field.key, val)}
            />
          ))}

        <TouchableOpacity style={styles.deleteBtn} onPress={deleteRow}>
          <Text style={styles.deleteBtnText}>Delete Item</Text>
        </TouchableOpacity>
      </ScrollView>

      {dirty && (
        <View style={styles.saveBar}>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  barcodeSection: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 16 },
  barcodeLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  barcodeValue: { fontSize: 18, fontWeight: "600", fontFamily: "monospace" },
  deleteBtn: { marginTop: 24, paddingVertical: 14, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: "#ef4444" },
  deleteBtnText: { color: "#ef4444", fontWeight: "600" },
  saveBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  saveBtn: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
