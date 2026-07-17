import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { api } from "../../lib/api";
import { cacheSheetsLocally, getCachedSheets, getPendingCount } from "../../lib/db";
import { syncPendingChanges } from "../../lib/sync";
import { Sheet, RootStackParamList } from "../../lib/types";

export default function SheetsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const loadSheets = useCallback(async () => {
    try {
      const data = await api.get<Sheet[]>("/sheets");
      setSheets(data);
      await cacheSheetsLocally(data);
    } catch {
      const cached = await getCachedSheets();
      if (cached.length > 0) {
        setSheets(cached as Sheet[]);
      }
    }
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadSheets);
    return unsubscribe;
  }, [navigation, loadSheets]);

  async function onRefresh() {
    setRefreshing(true);
    await syncPendingChanges();
    await loadSheets();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      {pendingCount > 0 && (
        <View style={styles.syncBar}>
          <Text style={styles.syncText}>{pendingCount} pending change{pendingCount > 1 ? "s" : ""} — pull to sync</Text>
        </View>
      )}
      <FlatList
        data={sheets}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        contentContainerStyle={sheets.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sheets yet</Text>
            <Text style={styles.emptySubtext}>Create sheets in the web dashboard</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("SheetDetail", { sheetId: item.id, sheetName: item.name })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{item.icon || "📋"}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description && <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>}
              </View>
            </View>
            <Text style={styles.cardMeta}>
              {item._count.rows} row{item._count.rows !== 1 ? "s" : ""} · {item._count.fields} field{item._count.fields !== 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  list: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: "center" },
  syncBar: { backgroundColor: "#fef3c7", paddingVertical: 8, paddingHorizontal: 16 },
  syncText: { color: "#92400e", fontSize: 13, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardIcon: { fontSize: 28, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "600", color: "#111" },
  cardDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  cardMeta: { fontSize: 12, color: "#9ca3af" },
  empty: { alignItems: "center" },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#6b7280" },
  emptySubtext: { fontSize: 14, color: "#9ca3af", marginTop: 4 },
});
