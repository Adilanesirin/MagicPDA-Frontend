// utils/database.ts
import * as SQLite from "expo-sqlite";

// Track database instances to prevent multiple connections
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync("magicpedia.db");
    console.log("✅ New database connection created");
  }
  return dbInstance;
};

export const closeDatabase = () => {
  if (dbInstance) {
    // Note: expo-sqlite doesn't have a close method in the current API
    // We'll just nullify the instance to allow garbage collection
    dbInstance = null;
    console.log("✅ Database connection released");
  }
};

export const initDatabase = async () => {
  const db = getDatabase();
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

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS orders_to_sync (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_code TEXT,
          userid TEXT,
          barcode TEXT,
          quantity NUMERIC,
          rate NUMERIC,
          mrp NUMERIC,
          order_date TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'pending'
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
    throw err;
  }
};

// Helper functions for common database operations
export const insertMasterData = async (data: Array<{code: string, name: string, place?: string}>) => {
  const db = getDatabase();
  try {
    await db.withTransactionAsync(async () => {
      for (const item of data) {
        await db.runAsync(
          'INSERT OR REPLACE INTO master_data (code, name, place) VALUES (?, ?, ?)',
          [item.code, item.name, item.place || null]
        );
      }
    });
    console.log(`✅ Inserted ${data.length} master data records`);
  } catch (err) {
    console.error("❌ Error inserting master data:", err);
    throw err;
  }
};

export const insertProductData = async (data: Array<{
  code: string, 
  name?: string, 
  barcode?: string, 
  quantity?: number, 
  salesprice?: number, 
  bmrp?: number, 
  cost?: number
}>) => {
  const db = getDatabase();
  try {
    await db.withTransactionAsync(async () => {
      for (const item of data) {
        await db.runAsync(
          'INSERT OR REPLACE INTO product_data (code, name, barcode, quantity, salesprice, bmrp, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.code, item.name || null, item.barcode || null, item.quantity || null, item.salesprice || null, item.bmrp || null, item.cost || null]
        );
      }
    });
    console.log(`✅ Inserted ${data.length} product data records`);
  } catch (err) {
    console.error("❌ Error inserting product data:", err);
    throw err;
  }
};

export const getAllSuppliers = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync('SELECT * FROM master_data ORDER BY name');
    console.log(`✅ Retrieved ${result.length} suppliers`);
    return result;
  } catch (err) {
    console.error("❌ Error fetching suppliers:", err);
    throw err;
  }
};

export const getProductByBarcode = async (barcode: string) => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(
      'SELECT * FROM product_data WHERE barcode = ?',
      [barcode]
    );
    return result;
  } catch (err) {
    console.error("❌ Error fetching product by barcode:", err);
    throw err;
  }
};

export const updateSyncTimestamp = async (timestamp: string) => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_info (id, last_synced) VALUES (1, ?)',
      [timestamp]
    );
    console.log("✅ Sync timestamp updated");
  } catch (err) {
    console.error("❌ Error updating sync timestamp:", err);
    throw err;
  }
};

export const getLastSyncTimestamp = async (): Promise<string | null> => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync('SELECT last_synced FROM sync_info WHERE id = 1') as {last_synced: string} | null;
    return result?.last_synced || null;
  } catch (err) {
    console.error("❌ Error getting last sync timestamp:", err);
    return null;
  }
};

// Export the database getter function instead of the instance
export default getDatabase;