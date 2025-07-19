// utils/database.ts
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("magicpedia.db");

export const initDatabase = async () => {
  try {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS master_data (
          code TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          place TEXT
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS product_data (
          code TEXT NOT NULL,
          name TEXT,
          barcode TEXT,
          quantity NUMERIC,
          salesprice NUMERIC,
          bmrp NUMERIC,
          cost NUMERIC
        );
      `);
    });

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_info (
         id INTEGER PRIMARY KEY CHECK (id = 1),
         last_synced TEXT
        );
      `);

    console.log("✅ Database initialized successfully.");
  } catch (err) {
    console.error("❌ Error initializing DB:", err);
  }
};

export default db;
