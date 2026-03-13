// utils/database.ts - COMPLETE FIXED VERSION WITH ALL FUNCTIONS
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

const columnExists = async (db: SQLite.SQLiteDatabase, tableName: string, columnName: string): Promise<boolean> => {
  try {
    const result = await db.getAllAsync(`PRAGMA table_info(${tableName})`) as any[];
    return result.some((col: any) => col.name === columnName);
  } catch {
    return false;
  }
};

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

const migrateCatagoryToCategory = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // First check if product_data table exists
    const tableExistsCheck = await tableExists(db, 'product_data');
    if (!tableExistsCheck) {
      console.log("ℹ️ product_data table doesn't exist yet, skipping category migration");
      return;
    }
    
    const hasCatagory = await columnExists(db, 'product_data', 'catagory');
    const hasCategory = await columnExists(db, 'product_data', 'category');
    
    console.log(`📊 Column check - catagory: ${hasCatagory}, category: ${hasCategory}`);
    
    if (!hasCategory) {
      console.log("✅ Adding 'category' column to product_data...");
      await db.execAsync(`ALTER TABLE product_data ADD COLUMN category TEXT DEFAULT '';`);
    }
    
    if (hasCatagory) {
      const catagoryData = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM product_data WHERE catagory IS NOT NULL AND catagory != ''"
      ) as any;
      
      if (catagoryData?.count > 0) {
        console.log(`📋 Found ${catagoryData.count} products with catagory data, copying to category...`);
        await db.execAsync(`UPDATE product_data SET category = catagory WHERE category IS NULL OR category = '';`);
        console.log("✅ Copied data from 'catagory' to 'category'");
      }
    }
    
    console.log("✅ Category columns ready");
  } catch (error) {
    console.error("❌ Error adding category column:", error);
  }
};

export const cleanupMigrationTables = async () => {
  const db = getDatabase();
  try {
    await db.execAsync(`DROP TABLE IF EXISTS pending_items_new;`);
    await db.execAsync(`DROP TABLE IF EXISTS pending_grn_items_new;`);
    await db.execAsync(`DROP TABLE IF EXISTS pending_returns_new;`);
    console.log("✅ Cleaned up migration tables");
  } catch (error) {
    console.log("ℹ️ No migration tables to clean up");
  }
};

// Migration: Recreate product_data table with new schema
export const migrateProductDataTable = async () => {
  const db = getDatabase();
  try {
    console.log("🔄 Checking if product_data table needs migration...");
    
    // Check if table exists first
    const exists = await tableExists(db, 'product_data');
    if (!exists) {
      console.log("ℹ️ product_data table doesn't exist yet, will be created in initDatabase");
      return;
    }
    
    // Check current schema
    const tableInfo = await db.getAllAsync('PRAGMA table_info(product_data)') as any[];
    const hasIdColumn = tableInfo.some((col: any) => col.name === 'id' && col.pk === 1);
    
    if (hasIdColumn) {
      console.log("✅ Table already has correct schema");
      return;
    }
    
    console.log("🔄 Migrating product_data table...");
    console.log(`📊 Old schema has ${tableInfo.length} columns`);
    
    // Get list of existing columns from old table
    const existingColumns = tableInfo.map((col: any) => col.name);
    console.log("📋 Existing columns:", existingColumns.join(', '));
    
    // Define all possible columns we want in the new schema
    const desiredColumns = [
      'code', 'name', 'barcode', 'quantity', 'CO', 'MR', 'bmrp', 'cost', 
      'brand', 'unit', 'taxcode', 'productcode', 'S1', 'S2', 
      'supplier', 'expirydate', 'batch_supplier', 'catagory', 'product', 
      'prices_json', 'salesprice', 'salesrate', 'mrp', 'purchaseprice', 
      'purchase_rate', 'category'
    ];
    
    // Find which columns exist in BOTH old and new schema
    const columnsToMigrate = desiredColumns.filter(col => existingColumns.includes(col));
    console.log(`✅ Will migrate ${columnsToMigrate.length} columns:`, columnsToMigrate.join(', '));
    
    // Backup existing data
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_data_backup AS 
      SELECT * FROM product_data;
    `);
    
    // Drop old table
    await db.execAsync(`DROP TABLE IF EXISTS product_data;`);
    
    // Create new table with correct schema
    await db.execAsync(`
      CREATE TABLE product_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        name TEXT,
        barcode TEXT UNIQUE NOT NULL,
        quantity NUMERIC DEFAULT 0,
        CO NUMERIC DEFAULT 0,
        MR NUMERIC DEFAULT 0,
        bmrp NUMERIC DEFAULT 0,
        cost NUMERIC DEFAULT 0,
        brand TEXT DEFAULT '',
        unit TEXT DEFAULT '',
        taxcode TEXT DEFAULT '0',
        productcode TEXT DEFAULT '',
        S1 NUMERIC DEFAULT 0,
        S2 NUMERIC DEFAULT 0,
        supplier TEXT,
        expirydate TEXT,
        batch_supplier TEXT DEFAULT '',
        catagory TEXT DEFAULT '',
        product TEXT DEFAULT '',
        prices_json TEXT DEFAULT '[]',
        salesprice NUMERIC DEFAULT 0,
        salesrate NUMERIC DEFAULT 0,
        mrp NUMERIC DEFAULT 0,
        purchaseprice NUMERIC DEFAULT 0,
        purchase_rate NUMERIC DEFAULT 0,
        category TEXT DEFAULT ''
      );
    `);
    
    // Create index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_product_barcode ON product_data(barcode);
    `);
    
    // Build dynamic INSERT statement with only columns that exist
    if (columnsToMigrate.length > 0) {
      const columnsList = columnsToMigrate.join(', ');
      const insertSQL = `
        INSERT OR IGNORE INTO product_data (${columnsList})
        SELECT ${columnsList}
        FROM product_data_backup;
      `;
      
      console.log("📝 Migration SQL:", insertSQL);
      await db.execAsync(insertSQL);
    } else {
      console.warn("⚠️ No common columns found - creating empty table");
    }
    
    // Drop backup
    await db.execAsync(`DROP TABLE IF EXISTS product_data_backup;`);
    
    const count = await db.getFirstAsync('SELECT COUNT(*) as count FROM product_data') as {count: number};
    console.log(`✅ Migration complete. Products in table: ${count?.count || 0}`);
    
  } catch (error) {
    console.error("❌ Error migrating product_data table:", error);
    // Clean up backup table if it exists
    try {
      await db.execAsync(`DROP TABLE IF EXISTS product_data_backup;`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    // Don't throw - let initDatabase continue
  }
};

export const initDatabase = async () => {
  const db = getDatabase();
  
  try {
   console.log("📄 Starting database initialization...");

    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA synchronous = NORMAL;');
    await db.execAsync('PRAGMA cache_size = 10000;');

    await cleanupMigrationTables();
    await migrateProductDataTable();

    // === MASTER DATA TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS master_data (
        code TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        place TEXT
      );
    `);

    // === PRODUCT DATA TABLE - COMPLETE SCHEMA ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        name TEXT,
        barcode TEXT UNIQUE NOT NULL,
        quantity NUMERIC DEFAULT 0,
        CO NUMERIC DEFAULT 0,
        MR NUMERIC DEFAULT 0,
        bmrp NUMERIC DEFAULT 0,
        cost NUMERIC DEFAULT 0,
        brand TEXT DEFAULT '',
        unit TEXT DEFAULT '',
        taxcode TEXT DEFAULT '0',
        productcode TEXT DEFAULT '',
        S1 NUMERIC DEFAULT 0,
        S2 NUMERIC DEFAULT 0,
        supplier TEXT,
        expirydate TEXT,
        batch_supplier TEXT DEFAULT '',
        catagory TEXT DEFAULT '',
        product TEXT DEFAULT '',
        prices_json TEXT DEFAULT '[]',
        salesprice NUMERIC DEFAULT 0,
        salesrate NUMERIC DEFAULT 0,
        mrp NUMERIC DEFAULT 0,
        purchaseprice NUMERIC DEFAULT 0,
        purchase_rate NUMERIC DEFAULT 0,
        category TEXT DEFAULT ''
      );
    `);

    // Create index on barcode for fast lookups
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_product_barcode ON product_data(barcode);
    `);

    await migrateCatagoryToCategory(db);

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
        is_manual_entry INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
        is_manual_entry INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === RETURNS TO SYNC TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS returns_to_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL,
        userid TEXT NOT NULL,
        itemcode TEXT,
        barcode TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        rate NUMERIC NOT NULL,
        mrp NUMERIC NOT NULL,
        return_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        product_name TEXT,
        is_manual_entry INTEGER DEFAULT 0,
        return_reason TEXT DEFAULT '',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === PENDING ITEMS TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_items (
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

    // === PENDING GRN ITEMS TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_grn_items (
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

    // === PENDING RETURNS TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_returns (
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
        isManualEntry INTEGER DEFAULT 0,
        return_reason TEXT DEFAULT ''
      );
    `);
    // === SALES TO SYNC TABLE ===
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS sales_to_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_code TEXT NOT NULL,
    userid TEXT NOT NULL,
    itemcode TEXT,
    barcode TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    mrp NUMERIC NOT NULL,
    sale_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    product_name TEXT,
    is_manual_entry INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate existing installs that have the table but are missing columns
await addColumnIfMissing(db, 'sales_to_sync', 'supplier_code', "TEXT NOT NULL DEFAULT ''");
await addColumnIfMissing(db, 'sales_to_sync', 'userid', "TEXT NOT NULL DEFAULT ''");
await addColumnIfMissing(db, 'sales_to_sync', 'itemcode', 'TEXT');
await addColumnIfMissing(db, 'sales_to_sync', 'barcode', "TEXT NOT NULL DEFAULT ''");
await addColumnIfMissing(db, 'sales_to_sync', 'quantity', 'NUMERIC NOT NULL DEFAULT 0');
await addColumnIfMissing(db, 'sales_to_sync', 'rate', 'NUMERIC NOT NULL DEFAULT 0');
await addColumnIfMissing(db, 'sales_to_sync', 'mrp', 'NUMERIC NOT NULL DEFAULT 0');
await addColumnIfMissing(db, 'sales_to_sync', 'sale_date', "TEXT NOT NULL DEFAULT ''");  // ← the fix
await addColumnIfMissing(db, 'sales_to_sync', 'product_name', 'TEXT');
await addColumnIfMissing(db, 'sales_to_sync', 'sales_date', "TEXT NOT NULL DEFAULT ''");
await addColumnIfMissing(db, 'sales_to_sync', 'is_manual_entry', 'INTEGER DEFAULT 0');
await addColumnIfMissing(db, 'sales_to_sync', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');
await addColumnIfMissing(db, 'sales_to_sync', 'customer', "TEXT DEFAULT ''");
await addColumnIfMissing(db, 'sales_to_sync', 'enclosures', "TEXT DEFAULT ''");
await addColumnIfMissing(db, 'sales_to_sync', 'description', "TEXT DEFAULT ''");
console.log("✅ sales_to_sync table ready");

    // === SYNC INFO TABLE ===
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_synced TEXT
      );
    `);

    console.log("✅ Database initialized successfully with complete schema.");
    
  } catch (err) {
    console.error("❌ Error initializing DB:", err);
    throw err;
  }
};

// ============================================
// MASTER DATA OPERATIONS
// ============================================

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

// Alias for insertMasterData to maintain compatibility with sync.ts
export const saveMasterData = insertMasterData;

export const getAllSuppliers = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync('SELECT * FROM master_data ORDER BY name');
    return result;
  } catch (err) {
    console.error("❌ Error fetching suppliers:", err);
    throw err;
  }
};

// ============================================
// PRODUCT DATA OPERATIONS
// ============================================

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

// ============================================
// SYNC INFO OPERATIONS
// ============================================

export const updateSyncTimestamp = async (timestamp: string) => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_info (id, last_synced) VALUES (1, ?)',
      [timestamp]
    );
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
    return null;
  }
};

// Alias for getLastSyncTimestamp to maintain compatibility with sync.ts
export const getLastSynced = getLastSyncTimestamp;

// ============================================
// ORDER FUNCTIONS
// ============================================

export const getPendingOrders = async () => {
  const db = getDatabase();
  try {
    const orders = await db.getAllAsync(
      `SELECT 
         o.*,
         p.name as product_name
       FROM orders_to_sync o 
       LEFT JOIN product_data p ON o.barcode = p.barcode 
       WHERE o.sync_status = ? 
       ORDER BY o.created_at ASC, o.id ASC`,
      ['pending']
    );
    return orders;
  } catch (err) {
    console.error("❌ Error fetching pending orders:", err);
    return [];
  }
};

export const getPendingOrdersByDateRange = async (startDate: string, endDate: string) => {
  const db = getDatabase();
  try {
    const orders = await db.getAllAsync(
      `SELECT 
         o.*,
         p.name as product_name
       FROM orders_to_sync o 
       LEFT JOIN product_data p ON o.barcode = p.barcode 
       WHERE o.sync_status = ? 
         AND o.order_date >= ? 
         AND o.order_date <= ?
       ORDER BY o.created_at ASC, o.id ASC`,
      ['pending', startDate, endDate]
    );
    return orders;
  } catch (err) {
    console.error("❌ Error fetching pending orders by date:", err);
    return [];
  }
};

export const markOrdersAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE orders_to_sync SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Orders marked as synced");
  } catch (err) {
    console.error("❌ Error marking orders as synced:", err);
    throw err;
  }
};

export const markOrdersAsSyncedByIds = async (orderIds: number[]) => {
  const db = getDatabase();
  try {
    if (orderIds.length === 0) return;
    const placeholders = orderIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE orders_to_sync SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      ['synced', ...orderIds]
    );
    console.log(`✅ ${orderIds.length} orders marked as synced by ID`);
  } catch (err) {
    console.error("❌ Error marking orders as synced by IDs:", err);
    throw err;
  }
};

export const saveOrderToSync = async (order: {
  supplier_code: string;
  userid: string;
  itemcode?: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  order_date: string;
  product_name?: string;
  is_manual_entry?: number;
}) => {
  const db = getDatabase();
  try {
    const existingOrder = await db.getFirstAsync(
      `SELECT id, quantity FROM orders_to_sync 
       WHERE barcode = ? AND order_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [order.barcode, order.order_date, order.userid, order.supplier_code]
    ) as any;

    if (existingOrder) {
      const newQuantity = (existingOrder.quantity || 0) + order.quantity;
      await db.runAsync(
        `UPDATE orders_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, order.rate, order.mrp, existingOrder.id]
      );
      console.log("✅ Updated existing order quantity");
    } else {
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO orders_to_sync 
         (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, order_date, product_name, is_manual_entry, sync_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)`,
        [
          order.supplier_code, 
          order.userid, 
          order.itemcode || order.barcode,
          order.barcode, 
          order.quantity, 
          order.rate, 
          order.mrp, 
          order.order_date,
          order.product_name || '',
          order.is_manual_entry || 0,
          now
        ]
      );
      console.log("✅ New order saved for sync");
    }
  } catch (err) {
    console.error("❌ Error saving order to sync:", err);
    throw err;
  }
};

// ============================================
// GRN FUNCTIONS - UPDATED TO MATCH SYNC.TS
// ============================================

export const getPendingGRNs = async () => {
  const db = getDatabase();
  try {
    const grns = await db.getAllAsync(
      `SELECT 
         g.*,
         p.name as product_name
       FROM grn_to_sync g 
       LEFT JOIN product_data p ON g.barcode = p.barcode 
       WHERE g.sync_status = ? 
       ORDER BY g.created_at ASC, g.id ASC`,
      ['pending']
    );
    return grns;
  } catch (err) {
    console.error("❌ Error getting pending GRNs:", err);
    return [];
  }
};

export const getPendingGRNsByDateRange = async (startDate: string, endDate: string) => {
  const db = getDatabase();
  try {
    const grns = await db.getAllAsync(
      `SELECT 
         g.*,
         p.name as product_name
       FROM grn_to_sync g 
       LEFT JOIN product_data p ON g.barcode = p.barcode 
       WHERE g.sync_status = ? 
         AND g.grn_date >= ? 
         AND g.grn_date <= ?
       ORDER BY g.created_at ASC, g.id ASC`,
      ['pending', startDate, endDate]
    );
    return grns;
  } catch (err) {
    console.error("❌ Error getting pending GRNs by date:", err);
    return [];
  }
};

export const markGRNsAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE grn_to_sync SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ GRNs marked as synced");
  } catch (err) {
    console.error("❌ Error marking GRNs as synced:", err);
    throw err;
  }
};

export const markGRNsAsSyncedByIds = async (grnIds: number[]) => {
  const db = getDatabase();
  try {
    if (grnIds.length === 0) return;
    const placeholders = grnIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE grn_to_sync SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      ['synced', ...grnIds]
    );
    console.log(`✅ ${grnIds.length} GRNs marked as synced by ID`);
  } catch (err) {
    console.error("❌ Error marking GRNs as synced by IDs:", err);
    throw err;
  }
};

export const saveGRNToSync = async (order: {
  supplier_code: string;
  userid: string;
  itemcode?: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  grn_date: string;
  product_name?: string;
  is_manual_entry?: number;
}) => {
  const db = getDatabase();
  try {
    const existingGRN = await db.getFirstAsync(
      `SELECT id, quantity FROM grn_to_sync 
       WHERE barcode = ? AND grn_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [order.barcode, order.grn_date, order.userid, order.supplier_code]
    ) as any;

    if (existingGRN) {
      const newQuantity = (existingGRN.quantity || 0) + order.quantity;
      await db.runAsync(
        `UPDATE grn_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, order.rate, order.mrp, existingGRN.id]
      );
      console.log("✅ Updated existing GRN quantity");
    } else {
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO grn_to_sync 
         (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, grn_date, product_name, is_manual_entry, sync_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)`,
        [
          order.supplier_code, 
          order.userid, 
          order.itemcode || order.barcode,
          order.barcode, 
          order.quantity, 
          order.rate, 
          order.mrp, 
          order.grn_date,
          order.product_name || '',
          order.is_manual_entry || 0,
          now
        ]
      );
      console.log("✅ New GRN saved for sync");
    }
  } catch (err) {
    console.error("❌ Error saving GRN to sync:", err);
    throw err;
  }
};

export const getPendingGRNOrders = getPendingGRNs;
export const markGRNOrdersAsSynced = markGRNsAsSynced;

export const getLocalGRNDataStats = async () => {
  const db = getDatabase();
  try {
    const stats = await db.getFirstAsync(
      `SELECT 
         COUNT(*) as totalCount,
         SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
         SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as syncedCount,
         MAX(created_at) as lastSynced
       FROM grn_to_sync`
    ) as any;
    return stats || { totalCount: 0, pendingCount: 0, syncedCount: 0, lastSynced: null };
  } catch (err) {
    console.error("❌ Error getting GRN stats:", err);
    return { totalCount: 0, pendingCount: 0, syncedCount: 0, lastSynced: null };
  }
};

// ============================================
// PURCHASE RETURN FUNCTIONS - UPDATED TO MATCH SYNC.TS
// ============================================

export const getPendingReturns = async () => {
  const db = getDatabase();
  try {
    const returns = await db.getAllAsync(
      `SELECT 
         r.*,
         p.name as product_name
       FROM returns_to_sync r 
       LEFT JOIN product_data p ON r.barcode = p.barcode 
       WHERE r.sync_status = ? 
       ORDER BY r.created_at ASC, r.id ASC`,
      ['pending']
    );
    return returns;
  } catch (err) {
    console.error("❌ Error getting pending returns:", err);
    return [];
  }
};

export const getPendingReturnsByDateRange = async (startDate: string, endDate: string) => {
  const db = getDatabase();
  try {
    const returns = await db.getAllAsync(
      `SELECT 
         r.*,
         p.name as product_name
       FROM returns_to_sync r 
       LEFT JOIN product_data p ON r.barcode = p.barcode 
       WHERE r.sync_status = ? 
         AND r.return_date >= ? 
         AND r.return_date <= ?
       ORDER BY r.created_at ASC, r.id ASC`,
      ['pending', startDate, endDate]
    );
    return returns;
  } catch (err) {
    console.error("❌ Error getting pending returns by date:", err);
    return [];
  }
};

export const markReturnsAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE returns_to_sync SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Returns marked as synced");
  } catch (err) {
    console.error("❌ Error marking returns as synced:", err);
    throw err;
  }
};

export const markReturnsAsSyncedByIds = async (returnIds: number[]) => {
  const db = getDatabase();
  try {
    if (returnIds.length === 0) return;
    const placeholders = returnIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE returns_to_sync SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      ['synced', ...returnIds]
    );
    console.log(`✅ ${returnIds.length} returns marked as synced by ID`);
  } catch (err) {
    console.error("❌ Error marking returns as synced by IDs:", err);
    throw err;
  }
};

export const saveReturnToSync = async (returnData: {
  supplier_code: string;
  userid: string;
  itemcode?: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  return_date: string;
  product_name?: string;
  is_manual_entry?: number;
  return_reason?: string;
}) => {
  const db = getDatabase();
  try {
    const existingReturn = await db.getFirstAsync(
      `SELECT id, quantity FROM returns_to_sync 
       WHERE barcode = ? AND return_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [returnData.barcode, returnData.return_date, returnData.userid, returnData.supplier_code]
    ) as any;

    if (existingReturn) {
      const newQuantity = (existingReturn.quantity || 0) + returnData.quantity;
      await db.runAsync(
        `UPDATE returns_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, returnData.rate, returnData.mrp, existingReturn.id]
      );
      console.log("✅ Updated existing return quantity");
    } else {
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO returns_to_sync 
         (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, return_date, product_name, is_manual_entry, return_reason, sync_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)`,
        [
          returnData.supplier_code, 
          returnData.userid, 
          returnData.itemcode || returnData.barcode,
          returnData.barcode, 
          returnData.quantity, 
          returnData.rate, 
          returnData.mrp, 
          returnData.return_date,
          returnData.product_name || '',
          returnData.is_manual_entry || 0,
          returnData.return_reason || '',
          now
        ]
      );
      console.log("✅ New return saved for sync");
    }
  } catch (err) {
    console.error("❌ Error saving return to sync:", err);
    throw err;
  }
};

export const cleanupDuplicateReturns = async () => {
  const db = getDatabase();
  try {
    const result = await db.runAsync(`
      DELETE FROM returns_to_sync 
      WHERE id NOT IN (
        SELECT MAX(id) 
        FROM returns_to_sync 
        GROUP BY barcode, itemcode, return_date, supplier_code, userid
      )
    `);
    console.log(`✅ Duplicate returns cleaned up (${result.changes || 0} removed)`);
    return result.changes || 0;
  } catch (err) {
    console.error("❌ Error cleaning up duplicate returns:", err);
    throw err;
  }
};

export const getLocalReturnStats = async () => {
  const db = getDatabase();
  try {
    const stats = await db.getFirstAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN sync_status = 'pending' THEN quantity ELSE 0 END) as totalItems,
        MAX(CASE WHEN sync_status = 'synced' THEN created_at END) as lastSynced
      FROM returns_to_sync
    `) as any;
    
    return {
      total: stats?.total || 0,
      pending: stats?.pending || 0,
      synced: stats?.synced || 0,
      lastSynced: stats?.lastSynced || null,
      totalItems: stats?.totalItems || 0
    };
  } catch (err) {
    console.error("❌ Error getting return stats:", err);
    return { total: 0, pending: 0, synced: 0, lastSynced: null, totalItems: 0 };
  }
};

// ============================================
// PRODUCT SYNC FUNCTIONS - ADDED FROM SYNC.TS
// ============================================

// Helper function to extract price by code from prices array
const getPriceByCode = (prices: any[] | undefined, priceCode: string): number => {
  if (!prices || !Array.isArray(prices)) return 0;
  const priceObj = prices.find((p: any) => p.price_code === priceCode);
  return priceObj ? parseFloat(priceObj.value) || 0 : 0;
};

export const saveProductData = async (data: any[]) => {
  const db = getDatabase();
  
  console.log(`📦 Starting to save ${data.length} products...`);
  const startTime = Date.now();
  
  try {
    let savedCount = 0;
    let skippedCount = 0;
    let duplicateSkipped = 0;
    const errors: any[] = [];

    await db.withTransactionAsync(async () => {
      console.log('🗑️ Clearing existing product data...');
      await db.runAsync('DELETE FROM product_data');
      console.log('✅ Existing product data cleared');
      
      const seenCodes = new Set<string>();
      const uniqueProducts: any[] = [];
      
      console.log(`🔍 Filtered: ${uniqueProducts.length} unique products (${duplicateSkipped} duplicates removed)`);
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const rawCode = item.code || item.product_code;
        const code = String(rawCode || '').trim();
        
        if (!code) {
          skippedCount++;
          continue;
        }
        
        if (seenCodes.has(code)) {
          duplicateSkipped++;
          continue;
        }
        
        seenCodes.add(code);
        uniqueProducts.push(item);
      }
      
      console.log(`🔍 Filtered: ${uniqueProducts.length} unique products (${duplicateSkipped} duplicates removed)`);
            
      const CHUNK_SIZE = 500;
      for (let i = 0; i < uniqueProducts.length; i += CHUNK_SIZE) {
        const chunk = uniqueProducts.slice(i, i + CHUNK_SIZE);
        
        const placeholders = chunk.map(() =>
          '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).join(',');
        
        const values = chunk.flatMap(item => {
          const pricesArray = item.prices || [];
          const cost = getPriceByCode(pricesArray, 'CO');
          const bmrp = getPriceByCode(pricesArray, 'MR');
          const CO = cost;
          const MR = bmrp;
          const S1 = getPriceByCode(pricesArray, 'S1');
          const S2 = getPriceByCode(pricesArray, 'S2');
          const code = String(item.code || item.product_code || '').trim();
          let barcode = item.barcode || `CODE_${code}`;
          return [
            code,
            item.name || item.product_name || 'Unknown',
            item.catagory || item.category || '',
            item.product || '',
            item.brand || '',
            item.unit || '',
            item.taxcode || '0',
            item.productcode || '',
            barcode,
            Number(item.quantity || item.stock || 0),
            item.supplier || null,
            item.expirydate || null,
            JSON.stringify(pricesArray),
            cost, bmrp, CO, MR, S1, S2,
            item.batch_supplier || item.supplier || '',
            Number(item.salesprice || item.selling_price || S1 || 0),
            Number(item.salesrate || S1 || 0),
            Number(item.mrp || MR || 0),
            Number(item.purchaseprice || item.purchase_price || CO || 0),
            Number(item.purchase_rate || CO || 0),
            item.catagory || item.category || ''
          ];
        });
        
        await db.runAsync(
          `INSERT OR REPLACE INTO product_data 
          (code, name, catagory, product, brand, unit, taxcode, productcode,
            barcode, quantity, supplier, expirydate, prices_json,
            cost, bmrp, CO, MR, S1, S2, batch_supplier,
            salesprice, salesrate, mrp, purchaseprice, purchase_rate, category)
          VALUES ${placeholders}`,
          values
        );
        
        savedCount += chunk.length;
        if (i % 10000 === 0) {
          console.log(`📊 Progress: ${Math.min(i + CHUNK_SIZE, uniqueProducts.length)}/${uniqueProducts.length}...`);
        }
      }
      });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ ===== PRODUCT SAVE COMPLETE =====`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📊 Total items: ${data.length}`);
    console.log(`✅ Saved: ${savedCount}`);
    console.log(`⚠️ Duplicates skipped: ${duplicateSkipped}`);
    console.log(`⚠️ Errors: ${errors.length}`);
    
    return {
      success: true,
      saved: savedCount,
      skipped: skippedCount,
      duplicates: duplicateSkipped,
      total: data.length,
      databaseCount: savedCount,
      duration: parseFloat(duration)
    };
    
  } catch (error) {
    console.error("❌ Error saving product data:", error);
    throw error;
  }
};

export const debugProductData = async (data: any[]) => {
  console.log("🔍 DEBUG: Analyzing product data for duplicates...");
  
  const codeMap: Record<string, any[]> = {};
  const duplicates: string[] = [];
  
  data.forEach((item, index) => {
    const code = String(item.code || item.product_code || '').trim();
    if (code) {
      if (!codeMap[code]) {
        codeMap[code] = [];
      }
      codeMap[code].push({
        index,
        name: item.name,
        barcode: item.barcode
      });
    }
  });
  
  Object.keys(codeMap).forEach(code => {
    if (codeMap[code].length > 1) {
      duplicates.push(code);
    }
  });
  
  console.log(`📊 DEBUG Results:`);
  console.log(`   Total items: ${data.length}`);
  console.log(`   Unique codes: ${Object.keys(codeMap).length}`);
  console.log(`   Duplicate codes found: ${duplicates.length}`);
  
  return {
    totalItems: data.length,
    uniqueCodes: Object.keys(codeMap).length,
    duplicateCodes: duplicates.length,
    duplicates: duplicates.slice(0, 50)
  };
};

export const cleanupDatabase = async () => {
  const db = getDatabase();
  try {
    console.log("🚨 Performing emergency database cleanup...");
    
    const beforeCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM product_data') as {count: number};
    console.log(`📊 Products before cleanup: ${beforeCount?.count || 0}`);
    
    await db.runAsync(`
      DELETE FROM product_data 
      WHERE rowid NOT IN (
        SELECT MIN(rowid) 
        FROM product_data 
        GROUP BY code
      )
    `);
    
    const afterCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM product_data') as {count: number};
    const removed = (beforeCount?.count || 0) - (afterCount?.count || 0);
    
    console.log(`✅ Cleanup complete: Removed ${removed} duplicates`);
    
    return {
      removed,
      beforeCount: beforeCount?.count || 0,
      afterCount: afterCount?.count || 0
    };
  } catch (error) {
    console.error("❌ Error during database cleanup:", error);
    throw error;
  }
};

// ============================================
// DATA STATISTICS FUNCTIONS - ADDED FROM SYNC.TS
// ============================================

export const getLocalDataStats = async () => {
  const db = getDatabase();
  try {
    const masterCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM master_data') as {count: number};
    const productCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM product_data') as {count: number};
    const lastSynced = await getLastSynced();
    
    return {
      masterCount: masterCount?.count || 0,
      productCount: productCount?.count || 0,
      lastSynced
    };
  } catch (error) {
    console.error("❌ Error getting local data stats:", error);
    return {
      masterCount: 0,
      productCount: 0,
      lastSynced: null
    };
  }
};

export const updateLastSynced = async () => {
  const db = getDatabase();
  try {
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_info (id, last_synced) VALUES (1, ?)',
      [now]
    );
    console.log("✅ Last synced timestamp updated:", now);
  } catch (error) {
    console.error("❌ Error updating last synced:", error);
    throw error;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const clearAllSyncData = async () => {
  const db = getDatabase();
  try {
    await db.runAsync('DELETE FROM orders_to_sync');
    await db.runAsync('DELETE FROM grn_to_sync');
    await db.runAsync('DELETE FROM returns_to_sync');
    await db.runAsync('DELETE FROM sync_info');
    console.log("✅ All sync data cleared");
  } catch (err) {
    console.error("❌ Error clearing sync data:", err);
    throw err;
  }
};

export default getDatabase;