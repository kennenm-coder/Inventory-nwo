import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Field } from "../../lib/types";
import { READ_ONLY_FIELD_TYPES } from "@scanvault/shared";

interface FieldInputProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const settings = field.settings || {};
  const isReadOnly = (READ_ONLY_FIELD_TYPES as readonly string[]).includes(field.type) ||
    (settings.read_only_mobile as boolean);

  if ((settings.hidden_mobile as boolean)) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {field.title}
        {(settings.required as boolean) && <Text style={styles.required}> *</Text>}
      </Text>
      {isReadOnly ? (
        <Text style={styles.readOnly}>{value != null ? String(value) : "-"}</Text>
      ) : (
        renderInput(field, value, onChange)
      )}
    </View>
  );
}

function renderInput(field: Field, value: unknown, onChange: (val: unknown) => void) {
  const str = value != null ? String(value) : "";
  const settings = field.settings || {};

  switch (field.type) {
    case "text":
    case "barcode":
      return (
        <TextInput
          style={styles.input}
          value={str}
          onChangeText={onChange}
          placeholder={settings.placeholder as string || `Enter ${field.title.toLowerCase()}...`}
          autoFocus={settings.auto_focus as boolean}
        />
      );

    case "number":
      return (
        <View style={styles.numberRow}>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Number(value || 0) - 1)}>
            <Text style={styles.stepperText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.numberInput]}
            value={str}
            onChangeText={(t) => onChange(t === "" ? null : Number(t))}
            keyboardType="numeric"
            textAlign="center"
          />
          <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Number(value || 0) + 1)}>
            <Text style={styles.stepperText}>+</Text>
          </TouchableOpacity>
        </View>
      );

    case "number_auto_increase":
    case "number_auto_decrease":
      return (
        <View style={styles.numberRow}>
          <TextInput
            style={[styles.input, styles.numberInput]}
            value={str}
            onChangeText={(t) => onChange(t === "" ? null : Number(t))}
            keyboardType="numeric"
            textAlign="center"
          />
          <Text style={styles.autoNote}>
            {field.type === "number_auto_increase" ? "Auto +1 on scan" : "Auto -1 on scan"}
          </Text>
        </View>
      );

    case "currency": {
      const code = (settings.currency_code as string) || "USD";
      return (
        <View style={styles.currencyRow}>
          <Text style={styles.currencyCode}>{code}</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={str}
            onChangeText={(t) => onChange(t === "" ? null : Number(t))}
            keyboardType="decimal-pad"
          />
        </View>
      );
    }

    case "email":
      return (
        <TextInput
          style={styles.input}
          value={str}
          onChangeText={onChange}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="email@example.com"
        />
      );

    case "url":
      return (
        <TextInput
          style={styles.input}
          value={str}
          onChangeText={onChange}
          keyboardType="url"
          autoCapitalize="none"
          placeholder="https://"
        />
      );

    case "date":
    case "date_automatic":
      return (
        <TouchableOpacity style={styles.input} onPress={() => onChange(new Date().toISOString().split("T")[0])}>
          <Text style={str ? styles.inputText : styles.placeholderText}>
            {str ? new Date(str).toLocaleDateString() : "Tap to set date"}
          </Text>
        </TouchableOpacity>
      );

    case "date_time":
    case "date_time_automatic":
      return (
        <TouchableOpacity style={styles.input} onPress={() => onChange(new Date().toISOString())}>
          <Text style={str ? styles.inputText : styles.placeholderText}>
            {str ? new Date(str).toLocaleString() : "Tap to set date/time"}
          </Text>
        </TouchableOpacity>
      );

    case "time":
      return (
        <TextInput
          style={styles.input}
          value={str}
          onChangeText={onChange}
          placeholder="HH:MM"
          keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
        />
      );

    case "drop_down": {
      const options = (settings.dropdown_options as string[]) || [];
      return (
        <View style={styles.dropdownContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownOption, str === opt && styles.dropdownOptionActive]}
              onPress={() => onChange(opt)}
            >
              <Text style={[styles.dropdownOptionText, str === opt && styles.dropdownOptionTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    case "true_false":
      return (
        <View style={styles.boolRow}>
          <TouchableOpacity
            style={[styles.boolBtn, (value === true || str === "true" || str === "YES") && styles.boolBtnActive]}
            onPress={() => onChange(true)}
          >
            <Text style={[styles.boolText, (value === true || str === "true" || str === "YES") && styles.boolTextActive]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.boolBtn, (value === false || str === "false" || str === "NO" || !value) && styles.boolBtnActive]}
            onPress={() => onChange(false)}
          >
            <Text style={[styles.boolText, (value === false || str === "false" || str === "NO" || !value) && styles.boolTextActive]}>NO</Text>
          </TouchableOpacity>
        </View>
      );

    case "gps_location":
      return (
        <View>
          <TextInput
            style={styles.input}
            value={str}
            onChangeText={onChange}
            placeholder="lat, lng"
          />
          <TouchableOpacity style={styles.gpsBtn} onPress={() => captureGps(onChange)}>
            <Text style={styles.gpsBtnText}>📍 Use Current Location</Text>
          </TouchableOpacity>
        </View>
      );

    case "photo":
    case "attachment":
    case "signature":
      return (
        <TouchableOpacity style={styles.input}>
          <Text style={styles.placeholderText}>
            {field.type === "photo" ? "📷 Tap to take photo" : field.type === "signature" ? "✏️ Tap to sign" : "📎 Tap to attach file"}
          </Text>
        </TouchableOpacity>
      );

    default:
      return (
        <TextInput
          style={styles.input}
          value={str}
          onChangeText={onChange}
          placeholder={`Enter ${field.title.toLowerCase()}...`}
        />
      );
  }
}

async function captureGps(onChange: (val: unknown) => void) {
  try {
    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    onChange(`${loc.coords.latitude}, ${loc.coords.longitude}`);
  } catch {}
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  required: { color: "#ef4444" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: "#fff" },
  inputText: { fontSize: 15, color: "#111" },
  placeholderText: { fontSize: 15, color: "#9ca3af" },
  readOnly: { fontSize: 15, color: "#6b7280", paddingVertical: 8 },
  numberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  numberInput: { flex: 1 },
  stepperBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  stepperText: { fontSize: 22, fontWeight: "500", color: "#374151" },
  autoNote: { fontSize: 12, color: "#9ca3af", marginLeft: 8 },
  currencyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currencyCode: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  dropdownContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  dropdownOptionActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },
  dropdownOptionTextActive: { color: "#fff", fontWeight: "600" },
  boolRow: { flexDirection: "row", gap: 8 },
  boolBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  boolBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  boolText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  boolTextActive: { color: "#fff" },
  gpsBtn: { marginTop: 8, paddingVertical: 10, alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 8 },
  gpsBtnText: { fontSize: 14, color: "#2563eb", fontWeight: "500" },
});
