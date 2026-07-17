import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { api } from "../../lib/api";
import { addPendingChange } from "../../lib/db";
import { FieldInput } from "../../components/fields/FieldInput";
import { Field, RootStackParamList } from "../../lib/types";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "RowCreate">;
  route: RouteProp<RootStackParamList, "RowCreate">;
};

export default function RowCreateScreen({ navigation, route }: Props) {
  const { sheetId, barcode: initialBarcode } = route.params;
  const [fields, setFields] = useState<Field[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [barcode, setBarcode] = useState(initialBarcode || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Field[]>(`/sheets/${sheetId}/fields`).then((data) => {
      setFields(data);
      const defaults: Record<string, unknown> = {};
      data.forEach((f) => {
        const settings = f.settings as Record<string, unknown>;
        if (settings.default_value != null) defaults[f.key] = settings.default_value;
        if (f.type === "date_automatic" || f.type === "date_time_automatic") defaults[f.key] = new Date().toISOString();
        if (f.type === "gps_location_automatic") captureGpsDefault(f.key, defaults);
      });
      setFormData(defaults);
    }).catch(() => {
      Alert.alert("Error", "Failed to load fields");
      navigation.goBack();
    }).finally(() => setLoading(false));
  }, [sheetId, navigation]);

  function updateField(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    const required = fields.filter((f) => (f.settings as Record<string, unknown>).required);
    for (const f of required) {
      if (formData[f.key] == null || formData[f.key] === "") {
        Alert.alert("Required Field", `"${f.title}" is required`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.post(`/sheets/${sheetId}/rows`, { barcode: barcode || undefined, data: formData });
      navigation.goBack();
    } catch {
      await addPendingChange(sheetId, null, "create_row", { barcode: barcode || undefined, data: formData });
      Alert.alert("Saved Offline", "Item saved locally and will sync when connected.");
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Barcode</Text>
          <TextInput
            style={styles.input}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Scan or enter barcode..."
          />
        </View>

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
      </ScrollView>

      <View style={styles.saveBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Create Item"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

async function captureGpsDefault(key: string, defaults: Record<string, unknown>) {
  try {
    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    defaults[key] = `${loc.coords.latitude}, ${loc.coords.longitude}`;
  } catch {}
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: "#fff" },
  saveBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  saveBtn: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
