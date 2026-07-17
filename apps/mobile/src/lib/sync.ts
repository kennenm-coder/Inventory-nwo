import { api } from "./api";
import { getPendingChanges, removePendingChange } from "./db";
import NetInfo from "@react-native-community/netinfo";

let syncing = false;

export async function syncPendingChanges(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return { synced: 0, failed: 0 };

  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const changes = await getPendingChanges();

    for (const change of changes) {
      try {
        const data = JSON.parse(change.data);

        switch (change.action) {
          case "create_row":
            await api.post(`/sheets/${change.sheet_id}/rows`, data);
            break;
          case "update_row":
            if (change.row_id) {
              await api.put(`/sheets/${change.sheet_id}/rows/${change.row_id}?partial=true`, data);
            }
            break;
          case "delete_row":
            if (change.row_id) {
              await api.delete(`/sheets/${change.sheet_id}/rows/${change.row_id}`);
            }
            break;
        }

        await removePendingChange(change.id);
        synced++;
      } catch {
        failed++;
      }
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}
