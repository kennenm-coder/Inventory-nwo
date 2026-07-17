import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl, Alert, Platform } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { api } from "../../lib/api";
import { cacheRowsLocally, getCachedRows } from "../../lib/db";
import { syncPendingChanges } from "../../lib/sync";
import { Row, Field, RootStackParamList } from "../../lib/types";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SheetDetail">;
  route: RouteProp<RootStackParamList, "SheetDetail">;
};

export default function SheetDetailScreen({ navigation, route }: Props) {
  const { sheetId, sheetName } = route.params;
  const [rows, setRows] = useState<Row[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [rowsData, fieldsData] = await Promise.all([
        api.get<Row[]>(`/sheets/${sheetId}/rows`),
        api.get<Field[]>(`/sheets/${sheetId}/fields`),
      ]);
      setRows(rowsData);
      setFields(fieldsData);
      await cacheRowsLocally(sheetId, rowsData);
    } catch {
      const cached = await getCachedRows(sheetId);
      if (cached.length > 0) setRows(cached as Row[]);
    }
  }, [sheetId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await syncPendingChanges();
    await loadData();
    setRefreshing(false);
  }

  const displayFields = fields.filter((f) => {
    const settings = f.settings as Record<string, unknown>;
    return settings.show_in_mobile_list || f.position < 3;
  });

  const filteredRows = search
    ? rows.filter((row) => {
        const q = search.toLowerCase();
        if (row.barcode?.toLowerCase().includes(q)) return true;
        return fields.some((f) => {
          const settings = f.settings as Record<string, unknown>;
          if (settings.searchable_mobile === false) return false;
          const val = row.data[f.key];
          return val != null && String(val).toLowerCase().includes(q);
        });
      })
    : rows;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search items..."
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filteredRows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        contentContainerStyle={filteredRows.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{search ? "No matching items" : "No items yet"}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("RowDetail", { sheetId, rowId: item.id, sheetName })}
          >
            {item.barcode && <Text style={styles.barcode}>{item.barcode}</Text>}
            {displayFields.map((f) => (
              <View key={f.key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{f.title}</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {formatValue(f.type, item.data[f.key])}
                </Text>
              </View>
            ))}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("RowCreate", { sheetId, sheetName })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function formatValue(type: string, value: unknown): string {
  if (value == null) return "-";
  if (type === "true_false") return value === true || value === "true" || value === "YES" ? "YES" : "NO";
  if (type === "currency") return `$${Number(value).toFixed(2)}`;
  if (type === "date" || type === "date_automatic") return new Date(String(value)).toLocaleDateString();
  return String(value);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  searchBar: { backgroundColor: "#fff", margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, fontSize: 15, borderWidth: 1, borderColor: "#e5e7eb" },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  emptyContainer: { flex: 1, justifyContent: "center" },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  barcode: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: "#6b7280", marginBottom: 6 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  fieldLabel: { fontSize: 13, color: "#6b7280", flex: 1 },
  fieldValue: { fontSize: 13, fontWeight: "500", color: "#111", flex: 2, textAlign: "right" },
  empty: { alignItems: "center" },
  emptyText: { fontSize: 16, color: "#9ca3af" },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
});
