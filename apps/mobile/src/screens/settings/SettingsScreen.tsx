import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAuth } from "../../lib/auth";
import { getPendingCount } from "../../lib/db";
import { syncPendingChanges } from "../../lib/sync";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  async function handleSync() {
    setSyncing(true);
    const result = await syncPendingChanges();
    const count = await getPendingCount();
    setPendingCount(count);
    setSyncing(false);

    if (result.synced > 0) {
      Alert.alert("Sync Complete", `${result.synced} change${result.synced > 1 ? "s" : ""} synced.`);
    } else if (result.failed > 0) {
      Alert.alert("Sync Issue", `${result.failed} change${result.failed > 1 ? "s" : ""} failed to sync.`);
    } else {
      Alert.alert("Up to Date", "No pending changes to sync.");
    }
  }

  function handleLogout() {
    if (pendingCount > 0) {
      Alert.alert(
        "Pending Changes",
        `You have ${pendingCount} unsynced change${pendingCount > 1 ? "s" : ""}. Logging out will lose them.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Logout Anyway", style: "destructive", onPress: logout },
        ],
      );
    } else {
      logout();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sync</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Pending changes</Text>
          <Text style={[styles.value, pendingCount > 0 && styles.pendingValue]}>{pendingCount}</Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
          <Text style={styles.syncBtnText}>{syncing ? "Syncing..." : "Sync Now"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ScanVault v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  label: { fontSize: 14, color: "#6b7280" },
  value: { fontSize: 14, fontWeight: "500", color: "#111" },
  pendingValue: { color: "#f59e0b", fontWeight: "700" },
  syncBtn: { marginTop: 12, backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  syncBtnText: { color: "#fff", fontWeight: "600" },
  logoutBtn: { paddingVertical: 14, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: "#ef4444" },
  logoutBtnText: { color: "#ef4444", fontWeight: "600", fontSize: 16 },
  version: { textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 24 },
});
