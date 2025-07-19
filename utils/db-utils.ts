import * as FileSystem from "expo-file-system";

export async function deleteOldDatabase() {
  const dbPath = `${FileSystem.documentDirectory}SQLite/app.db`;

  const dbExists = await FileSystem.getInfoAsync(dbPath);
  if (dbExists.exists) {
    try {
      await FileSystem.deleteAsync(dbPath, { idempotent: true });
      console.log("🗑️ Old database deleted.");
    } catch (error) {
      console.error("❌ Failed to delete old DB:", error);
    }
  } else {
    console.log("ℹ️ No old DB found.");
  }
}
