// utils/database.ts
import * as SQLite from "expo-sqlite";

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
    dbInstance = null;
    console.log("✅ Database connection released");
  }
};

// Helper to safely check if column exists
const columnExists = async (db: SQLite.SQLiteDatabase, tableName: string, columnName: string): Promise<boolean> => {
  try {
    const result = await db.getAllAsync(`PRAGMA table_info(${tableName})`) as any[];
    return result.some((col: any) => col.name === columnName);
  } catch {
    return false;
  }
};

// Helper to safely check if table exists
const tableExists = async (db: SQLite.SQLiteDatabase, tableName: string): Promise<boolean> => {
  try {
    const result = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    ) as any;
    return !!result;
  } catch {
    return false;
  }
};

// Helper to safely add column
const addColumnIfMissing = async (
  db: SQLite.SQLiteDatabase, 
  tableName: string, 
  columnName: string, 
  columnDef: string
): Promise<void> => {
  try {
    const exists = await columnExists(db, tableName, columnName);
    if (!exists) {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
      console.log(`✅ Added column ${columnName} to ${tableName}`);
    }
  } catch (error) {
    console.log(`ℹ️ Column ${columnName} already exists or couldn't be added`);
  }
};

// Clean up any temporary migration tables
export const cleanupMigrationTables = async () => {
  const db = getDatabase();
  try {
    await db.execAsync(`DROP TABLE IF EXISTS pending_items_new;`);
    await db.execAsync(`DROP TABLE IF EXISTS pending_grn_items_new;`);
    console.log("✅ Cleaned up migration tables");
  } catch (error) {
    console.log("ℹ️ No migration tables to clean up");
  }
};

export const initDatabase = async () => {
  const db = getDatabase();
  
  try {
    console.log("🔄 Starting database initialization...");

    // Clean up any temporary tables first
    await cleanupMigrationTables();

    // === MASTER DATA TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS master_data (
        code TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        place TEXT
      );
    `);

    // === PRODUCT DATA TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_data (
        code TEXT NOT NULL,
        name TEXT,
        barcode TEXT PRIMARY KEY,
        quantity NUMERIC,
        salesprice NUMERIC,
        bmrp NUMERIC,
        cost NUMERIC,
        batch_supplier TEXT
      );
    `);

    // Add batch_supplier if missing
    await addColumnIfMissing(db, 'product_data', 'batch_supplier', 'TEXT');

    // === ORDERS TO SYNC TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS orders_to_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL,
        userid TEXT NOT NULL,
        itemcode TEXT,
        barcode TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        rate NUMERIC NOT NULL,
        mrp NUMERIC NOT NULL,
        order_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        product_name TEXT,
        is_manual_entry INTEGER DEFAULT 0
      );
    `);

    // === GRN TO SYNC TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grn_to_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL,
        userid TEXT NOT NULL,
        itemcode TEXT,
        barcode TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        rate NUMERIC NOT NULL,
        mrp NUMERIC NOT NULL,
        grn_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        product_name TEXT,
        is_manual_entry INTEGER DEFAULT 0
      );
    `);

    // === PENDING ITEMS TABLE (ORDERS) ===
    const pendingItemsExists = await tableExists(db, 'pending_items');
    
    if (pendingItemsExists) {
      // Check schema and migrate if needed
      const hasSupplierCode = await columnExists(db, 'pending_items', 'supplier_code');
      
      if (!hasSupplierCode) {
        console.log("🔄 Migrating pending_items table...");
        
        // Try to backup data
        let backupData: any[] = [];
        try {
          backupData = await db.getAllAsync('SELECT * FROM pending_items') as any[];
        } catch (e) {
          console.log("ℹ️ No data to backup");
        }
        
        // Drop old table and create new one
        await db.execAsync(`DROP TABLE IF EXISTS pending_items;`);
        
        await db.execAsync(`
          CREATE TABLE pending_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_code TEXT NOT NULL DEFAULT '',
            barcode TEXT NOT NULL,
            name TEXT,
            bmrp REAL DEFAULT 0,
            cost REAL DEFAULT 0,
            quantity INTEGER DEFAULT 0,
            eCost REAL DEFAULT 0,
            currentStock INTEGER DEFAULT 0,
            batchSupplier TEXT,
            scannedAt INTEGER,
            batch_supplier TEXT,
            product TEXT,
            brand TEXT,
            isManualEntry INTEGER DEFAULT 0
          );
        `);
        
        // Try to restore data
        if (backupData.length > 0) {
          console.log(`🔄 Restoring ${backupData.length} items...`);
          for (const item of backupData) {
            try {
              await db.runAsync(
                `INSERT INTO pending_items 
                (supplier_code, barcode, name, bmrp, cost, quantity, eCost, currentStock, batchSupplier, scannedAt, batch_supplier, product, brand, isManualEntry)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  '',
                  item.barcode || '',
                  item.name || '',
                  item.bmrp || 0,
                  item.cost || 0,
                  item.quantity || 0,
                  item.eCost || 0,
                  item.currentStock || 0,
                  item.batchSupplier || '',
                  item.scannedAt || Date.now(),
                  item.batch_supplier || '',
                  item.product || '',
                  item.brand || '',
                  item.isManualEntry || 0
                ]
              );
            } catch (insertErr) {
              console.log(`⚠️ Could not restore item: ${item.barcode}`);
            }
          }
        }
        
        console.log("✅ Migrated pending_items table");
      }
    } else {
      // Create new table
      await db.execAsync(`
        CREATE TABLE pending_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_code TEXT NOT NULL DEFAULT '',
          barcode TEXT NOT NULL,
          name TEXT,
          bmrp REAL DEFAULT 0,
          cost REAL DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          eCost REAL DEFAULT 0,
          currentStock INTEGER DEFAULT 0,
          batchSupplier TEXT,
          scannedAt INTEGER,
          batch_supplier TEXT,
          product TEXT,
          brand TEXT,
          isManualEntry INTEGER DEFAULT 0
        );
      `);
      console.log("✅ Created pending_items table");
    }

    // === PENDING GRN ITEMS TABLE ===
    const pendingGRNExists = await tableExists(db, 'pending_grn_items');
    
    if (pendingGRNExists) {
      const hasSupplierCode = await columnExists(db, 'pending_grn_items', 'supplier_code');
      
      if (!hasSupplierCode) {
        console.log("🔄 Migrating pending_grn_items table...");
        
        await db.execAsync(`DROP TABLE IF EXISTS pending_grn_items;`);
        
        await db.execAsync(`
          CREATE TABLE pending_grn_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_code TEXT NOT NULL DEFAULT '',
            barcode TEXT NOT NULL,
            name TEXT,
            bmrp REAL DEFAULT 0,
            cost REAL DEFAULT 0,
            quantity INTEGER DEFAULT 0,
            eCost REAL DEFAULT 0,
            currentStock INTEGER DEFAULT 0,
            batchSupplier TEXT,
            scannedAt INTEGER,
            batch_supplier TEXT,
            product TEXT,
            brand TEXT,
            isManualEntry INTEGER DEFAULT 0
          );
        `);
        
        console.log("✅ Migrated pending_grn_items table");
      }
    } else {
      await db.execAsync(`
        CREATE TABLE pending_grn_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_code TEXT NOT NULL DEFAULT '',
          barcode TEXT NOT NULL,
          name TEXT,
          bmrp REAL DEFAULT 0,
          cost REAL DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          eCost REAL DEFAULT 0,
          currentStock INTEGER DEFAULT 0,
          batchSupplier TEXT,
          scannedAt INTEGER,
          batch_supplier TEXT,
          product TEXT,
          brand TEXT,
          isManualEntry INTEGER DEFAULT 0
        );
      `);
      console.log("✅ Created pending_grn_items table");
    }

    // === SYNC INFO TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_synced TEXT
      );
    `);

    console.log("✅ Database initialized successfully with GRN tables.");
    
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
  cost?: number,
  batch_supplier?: string
}>) => {
  const db = getDatabase();
  try {
    await db.withTransactionAsync(async () => {
      for (const item of data) {
        await db.runAsync(
          'INSERT OR REPLACE INTO product_data (code, name, barcode, quantity, salesprice, bmrp, cost, batch_supplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            item.code, 
            item.name || null, 
            item.barcode || null, 
            item.quantity || 0, 
            item.salesprice || 0, 
            item.bmrp || 0, 
            item.cost || 0,
            item.batch_supplier || null
          ]
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

// Get pending orders for upload
export const getPendingOrders = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM orders_to_sync WHERE sync_status = ? ORDER BY created_at',
      ['pending']
    );
    console.log(`✅ Retrieved ${result.length} pending orders`);
    return result;
  } catch (err) {
    console.error("❌ Error fetching pending orders:", err);
    return [];
  }
};

// Mark orders as synced
export const markOrdersAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE orders_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Orders marked as synced");
  } catch (err) {
    console.error("❌ Error marking orders as synced:", err);
    throw err;
  }
};

// Save order to sync table
export const saveOrderToSync = async (order: {
  supplier_code: string;
  userid: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  order_date: string;
}) => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'INSERT INTO orders_to_sync (supplier_code, userid, barcode, quantity, rate, mrp, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [order.supplier_code, order.userid, order.barcode, order.quantity, order.rate, order.mrp, order.order_date]
    );
    console.log("✅ Order saved for sync");
  } catch (err) {
    console.error("❌ Error saving order to sync:", err);
    throw err;
  }
};

export default getDatabase;