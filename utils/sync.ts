// utils/sync.ts - COMPLETE FIXED VERSION
import { getDatabase } from "./database";

// Save master data
export const saveMasterData = async (data: any[]) => {
  const db = getDatabase();
  try {
    console.log(`💾 Saving ${data.length} master records...`);
    
    await db.withTransactionAsync(async () => {
      // 🔥 CRITICAL: Clear old data first
      await db.runAsync('DELETE FROM master_data');
      console.log('🗑️ Cleared old master data');
      
      // Insert new data
      let savedCount = 0;
   for (const item of data) {
        if (!item.code || !item.name) {
          console.warn(`⚠️ Skipping invalid record:`, item);
          continue;
        }
        await db.runAsync(
          'INSERT OR REPLACE INTO master_data (code, name, place) VALUES (?, ?, ?)',
          [item.code, item.name, item.place || null]
        );
        savedCount++;
      }
      
      console.log(`✅ Inserted ${savedCount} master records`);
    });
    
    // Verify the save
    const verifyResult = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM master_data'
    ) as {count: number};
    
    console.log(`✅ Verification: ${verifyResult?.count || 0} records in master_data table`);
    
  } catch (error) {
    console.error("❌ Error saving master data:", error);
    throw error;
  }
};

// Helper function to extract price by code from prices array
const getPriceByCode = (prices: any[] | undefined, priceCode: string): number => {
  if (!prices || !Array.isArray(prices)) return 0;
  const priceObj = prices.find((p: any) => p.price_code === priceCode);
  return priceObj ? parseFloat(priceObj.value) || 0 : 0;
};

// Save product data with ALL 25 fields
// utils/sync.ts - FIXED saveProductData function

export const saveProductData = async (data: any[]) => {
  const db = getDatabase();
  
  console.log(`📦 Starting to save ${data.length} products...`);
  const startTime = Date.now();
  
  try {
    let savedCount = 0;
    let skippedCount = 0;
    let duplicateSkipped = 0;
    const errors: any[] = [];

  try {
      await db.runAsync(`ALTER TABLE product_data ADD COLUMN text1 TEXT DEFAULT ''`);
    } catch (e) { /* column already exists, ignore */ }

    await db.withTransactionAsync(async () => {
      console.log('🗑️ Clearing existing product data...');
      await db.runAsync('DELETE FROM product_data');
      
      const seenBarcodes = new Set<string>();
      const uniqueProducts: any[] = [];
      
      console.log('🔍 Pre-filtering duplicates by barcode...');
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const code = String(item.code || item.product_code || '').trim();
        let barcode = item.barcode;
        
        // Generate barcode from code if missing
        if (!barcode || barcode === null || barcode === '') {
          barcode = `CODE_${code}`;
        }
        
        if (!code) {
          skippedCount++;
          continue;
        }
        
        // Check for duplicate BARCODE (not code!)
        if (seenBarcodes.has(barcode)) {
          duplicateSkipped++;
          continue;
        }
        
        seenBarcodes.add(barcode);
        uniqueProducts.push(item);
      }
      
      console.log(`🔍 Filtered: ${uniqueProducts.length} unique products by barcode (${duplicateSkipped} duplicate barcodes removed)`);
      
      const CHUNK_SIZE = 500;
      for (let i = 0; i < uniqueProducts.length; i += CHUNK_SIZE) {
        const chunk = uniqueProducts.slice(i, i + CHUNK_SIZE);
       const placeholders = chunk.map(() =>
          '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).join(',');
        const values = chunk.flatMap(item => {
          const code = String(item.code || item.product_code || '').trim();
          const barcode = item.barcode || `CODE_${code}`;
          const pricesArray = item.prices || [];
          const cost = getPriceByCode(pricesArray, 'CO');
          const bmrp = getPriceByCode(pricesArray, 'MR');
          const S1 = getPriceByCode(pricesArray, 'S1');
          const S2 = getPriceByCode(pricesArray, 'S2');
          const categoryValue = item.catagory || item.category || '';
          return [
            code,
            item.name || item.product_name || 'Unknown',
            categoryValue,
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
            cost, bmrp, cost, bmrp, S1, S2,
            item.batch_supplier || item.supplier || '',
            Number(item.salesprice || item.selling_price || S1 || 0),
            Number(item.salesrate || S1 || 0),
            Number(item.mrp || bmrp || 0),
            Number(item.purchaseprice || item.purchase_price || cost || 0),
            Number(item.purchase_rate || cost || 0),
            categoryValue,
             item.text1 || ''
          ];
        });
        await db.runAsync(
          `INSERT OR IGNORE INTO product_data 
           (code, name, catagory, product, brand, unit, taxcode, productcode,
            barcode, quantity, supplier, expirydate, prices_json,
            cost, bmrp, CO, MR, S1, S2, batch_supplier,
            salesprice, salesrate, mrp, purchaseprice, purchase_rate, category, text1)
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
    
    // Verify data was actually saved
    const verifyResult = await db.getAllAsync(
      "SELECT code, name, catagory, product, brand, unit, taxcode, productcode, supplier FROM product_data LIMIT 5"
    ) as any[];
    
    console.log('📋 Verification after save:');
    verifyResult.forEach((row: any, idx: number) => {
      console.log(`   ${idx + 1}. ${row.code} - ${row.name}`);
      console.log(`      Category: "${row.catagory}"`);
      console.log(`      Product Type: "${row.product}"`);
      console.log(`      Brand: "${row.brand}"`);
      console.log(`      Unit: "${row.unit}"`);
      console.log(`      Tax Code: "${row.taxcode}"`);
      console.log(`      Product Code: "${row.productcode}"`);
      console.log(`      Supplier: "${row.supplier}"`);
    });
    
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

// Debug function to check for duplicate codes
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

// Emergency database cleanup
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

// Get local data statistics
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

// Update last synced timestamp
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

// Get last synced timestamp
export const getLastSynced = async () => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync('SELECT last_synced FROM sync_info WHERE id = 1') as {last_synced: string};
    return result?.last_synced || null;
  } catch (error) {
    console.error("❌ Error getting last synced:", error);
    return null;
  }
};

// ============================================
// ORDER SYNC FUNCTIONS (unchanged)
// ============================================

export const getPendingOrders = async () => {
  const db = getDatabase();
  try {
    const orders = await db.getAllAsync(
  `SELECT 
     o.*,
     COALESCE(o.product_name, p.name, '') as product_name
   FROM orders_to_sync o 
   LEFT JOIN product_data p ON o.barcode = p.barcode 
   WHERE o.sync_status = ? 
   ORDER BY o.created_at ASC, o.id ASC`,
  ['pending']
);
    return orders;
  } catch (error) {
    console.error("❌ Error getting pending orders:", error);
    return [];
  }
};

export const getPendingStockCounts = async () => {
  const db = getDatabase();
  try {
    const counts = await db.getAllAsync(
      `SELECT sc.id, sc.userid, sc.itemcode, sc.barcode,
              sc.quantity, sc.count_date, sc.sync_status, sc.created_at,
              sc.product_name, sc.rate, sc.mrp
       FROM stock_count_to_sync sc
       WHERE sc.sync_status = 'pending'
       ORDER BY sc.created_at ASC, sc.id ASC`
    ) as any[];
    console.log(`📊 Pending stock counts: ${counts.length}`);
    return counts;
  } catch (error) {
    console.error("❌ Error getting pending stock counts:", error);
    return [];
  }
};

export const markStockCountsAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE stock_count_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Stock counts marked as synced");
  } catch (error) {
    console.error("❌ Error marking stock counts as synced:", error);
    throw error;
  }
};

export const getPendingOrdersByDateRange = async (startDate: string, endDate: string) => {
  const db = getDatabase();
  try {
   const orders = await db.getAllAsync(
  `SELECT 
     o.*,
     COALESCE(o.product_name, p.name, '') as product_name
   FROM orders_to_sync o 
   LEFT JOIN product_data p ON o.barcode = p.barcode 
   WHERE o.sync_status = ? 
     AND o.order_date >= ? 
     AND o.order_date <= ?
   ORDER BY o.created_at ASC, o.id ASC`,
  ['pending', startDate, endDate]
);
    return orders;
  } catch (error) {
    console.error("❌ Error getting pending orders by date:", error);
    return [];
  }
};

export const markOrdersAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE orders_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Orders marked as synced");
  } catch (error) {
    console.error("❌ Error marking orders as synced:", error);
    throw error;
  }
};

export const markOrdersAsSyncedByIds = async (orderIds: number[]) => {
  const db = getDatabase();
  try {
    if (orderIds.length === 0) return;
    const placeholders = orderIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE orders_to_sync SET sync_status = ? WHERE id IN (${placeholders})`,
      ['synced', ...orderIds]
    );
    console.log(`✅ ${orderIds.length} orders marked as synced by ID`);
  } catch (error) {
    console.error("❌ Error marking orders as synced by IDs:", error);
    throw error;
  }
};

export const saveOrderToSync = async (order: {
  supplier_code: string;
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  order_date: string;
  product_name?: string;
  is_manual_entry?: number;
  text1?: string;
}) => {
  const db = getDatabase();
  try {
    const existingOrder = await db.getFirstAsync(
      `SELECT id, quantity, created_at FROM orders_to_sync 
       WHERE barcode = ? AND order_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [order.barcode, order.order_date, order.userid, order.supplier_code]
    ) as any;

    const now = new Date().toISOString();
    
    if (existingOrder) {
      const newQuantity = (existingOrder.quantity || 0) + order.quantity;
      await db.runAsync(
        `UPDATE orders_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, created_at = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, order.rate, order.mrp, existingOrder.created_at || now, existingOrder.id]
      );
    } else {
     await db.runAsync(
        `INSERT INTO orders_to_sync 
         (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, order_date, product_name, is_manual_entry, text1, sync_status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          order.supplier_code, 
          order.userid, 
          order.itemcode,
          order.barcode, 
          order.quantity, 
          order.rate, 
          order.mrp, 
          order.order_date,
          order.product_name || '',
          order.is_manual_entry || 0,
          order.text1 || '',
          now
        ]
      );
    }
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE orders_to_sync 
         SET quantity = quantity + ?, rate = ?, mrp = ?, created_at = COALESCE(created_at, ?), updated_at = CURRENT_TIMESTAMP 
         WHERE barcode = ? AND order_date = ? AND userid = ? AND supplier_code = ?`,
        [order.quantity, order.rate, order.mrp, now, order.barcode, order.order_date, order.userid, order.supplier_code]
      );
    } else {
      console.error("❌ Error saving order to sync:", error);
      throw error;
    }
  }
};

// ============================================
// GRN FUNCTIONS (unchanged)
// ============================================

export const getPendingGRNs = async () => {
  const db = getDatabase();
  try {
    const grns = await db.getAllAsync(
      `SELECT 
         g.*,
         COALESCE(g.product_name, p.name) as product_name
       FROM grn_to_sync g 
       LEFT JOIN product_data p ON g.barcode = p.barcode 
       WHERE g.sync_status = ? 
       ORDER BY g.created_at ASC, g.id ASC`,
      ['pending']
    );
    return grns;
  } catch (error) {
    console.error("❌ Error getting pending GRNs:", error);
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
  } catch (error) {
    console.error("❌ Error getting pending GRNs by date:", error);
    return [];
  }
};

export const markGRNsAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE grn_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ GRNs marked as synced");
  } catch (error) {
    console.error("❌ Error marking GRNs as synced:", error);
    throw error;
  }
};

export const markGRNsAsSyncedByIds = async (grnIds: number[]) => {
  const db = getDatabase();
  try {
    if (grnIds.length === 0) return;
    const placeholders = grnIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE grn_to_sync SET sync_status = ? WHERE id IN (${placeholders})`,
      ['synced', ...grnIds]
    );
    console.log(`✅ ${grnIds.length} GRNs marked as synced by ID`);
  } catch (error) {
    console.error("❌ Error marking GRNs as synced by IDs:", error);
    throw error;
  }
};

export const saveGRNToSync = async (order: {
  supplier_code: string;
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  grn_date: string;
  product_name?: string;
  is_manual_entry?: number;
    text1?: string;   
}) => {
  const db = getDatabase();
  try {
    const existingGRN = await db.getFirstAsync(
      `SELECT id, quantity, created_at FROM grn_to_sync 
       WHERE barcode = ? AND grn_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [order.barcode, order.grn_date, order.userid, order.supplier_code]
    ) as any;

    const now = new Date().toISOString();
    
    if (existingGRN) {
      const newQuantity = (existingGRN.quantity || 0) + order.quantity;
      await db.runAsync(
        `UPDATE grn_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, created_at = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, order.rate, order.mrp, existingGRN.created_at || now, existingGRN.id]
      );
    } else {
     await db.runAsync(
        `INSERT INTO grn_to_sync 
         (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, grn_date, product_name, is_manual_entry, text1, sync_status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          order.supplier_code, 
          order.userid, 
          order.itemcode,
          order.barcode, 
          order.quantity, 
          order.rate, 
          order.mrp, 
          order.grn_date,
          order.product_name || '',
          order.is_manual_entry || 0,
          order.text1 || '',   // ✅ ADD this value
          now
        ]
      );
    }
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE grn_to_sync 
         SET quantity = quantity + ?, rate = ?, mrp = ?, created_at = COALESCE(created_at, ?), updated_at = CURRENT_TIMESTAMP 
         WHERE barcode = ? AND grn_date = ? AND userid = ? AND supplier_code = ?`,
        [order.quantity, order.rate, order.mrp, now, order.barcode, order.grn_date, order.userid, order.supplier_code]
      );
    } else {
      console.error("❌ Error saving GRN to sync:", error);
      throw error;
    }
  }
};

export const getPendingGRNOrders = getPendingGRNs;
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
  } catch (error) {
    console.error("❌ Error getting GRN stats:", error);
    return { totalCount: 0, pendingCount: 0, syncedCount: 0, lastSynced: null };
  }
};
export const markGRNOrdersAsSynced = markGRNsAsSynced;

// ============================================
// PURCHASE RETURN FUNCTIONS (unchanged)
// ============================================

export const getPendingReturns = async () => {
  const db = getDatabase();
  try {
    const returns = await db.getAllAsync(
      `SELECT 
         r.*,
         COALESCE(r.product_name, p.name, '') as product_name,
         COALESCE(r.text1, '') as text1
       FROM returns_to_sync r 
       LEFT JOIN product_data p ON r.barcode = p.barcode 
       WHERE r.sync_status = ? 
       ORDER BY r.created_at ASC, r.id ASC`,
      ['pending']
    );
    return returns;
  } catch (error) {
    console.error("❌ Error getting pending returns:", error);
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
  } catch (error) {
    console.error("❌ Error getting pending returns by date:", error);
    return [];
  }
};

export const markReturnsAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE returns_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Returns marked as synced");
  } catch (error) {
    console.error("❌ Error marking returns as synced:", error);
    throw error;
  }
};

export const markReturnsAsSyncedByIds = async (returnIds: number[]) => {
  const db = getDatabase();
  try {
    if (returnIds.length === 0) return;
    const placeholders = returnIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE returns_to_sync SET sync_status = ? WHERE id IN (${placeholders})`,
      ['synced', ...returnIds]
    );
    console.log(`✅ ${returnIds.length} returns marked as synced by ID`);
  } catch (error) {
    console.error("❌ Error marking returns as synced by IDs:", error);
    throw error;
  }
};

export const saveReturnToSync = async (returnData: {
  supplier_code: string;
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  return_date: string;
  product_name?: string;
  is_manual_entry?: number;
  return_reason?: string;
  text1?: string; 
}) => {
  const db = getDatabase();
  try {
    const existingReturn = await db.getFirstAsync(
      `SELECT id, quantity, created_at FROM returns_to_sync 
       WHERE barcode = ? AND return_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [returnData.barcode, returnData.return_date, returnData.userid, returnData.supplier_code]
    ) as any;

    const now = new Date().toISOString();
    
    if (existingReturn) {
      const newQuantity = (existingReturn.quantity || 0) + returnData.quantity;
      await db.runAsync(
        `UPDATE returns_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, created_at = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, returnData.rate, returnData.mrp, existingReturn.created_at || now, existingReturn.id]
      );
    } else {
     await db.runAsync(
        `INSERT INTO returns_to_sync 
         (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, return_date, product_name, is_manual_entry, return_reason, text1, sync_status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          returnData.supplier_code, 
          returnData.userid, 
          returnData.itemcode,
          returnData.barcode, 
          returnData.quantity, 
          returnData.rate, 
          returnData.mrp, 
          returnData.return_date,
          returnData.product_name || '',
          returnData.is_manual_entry || 0,
          returnData.return_reason || '',
          returnData.text1 || '',   // ✅ ADD this value
          now
        ]
      );
    }
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE returns_to_sync 
         SET quantity = quantity + ?, rate = ?, mrp = ?, created_at = COALESCE(created_at, ?), updated_at = CURRENT_TIMESTAMP 
         WHERE barcode = ? AND return_date = ? AND userid = ? AND supplier_code = ?`,
        [returnData.quantity, returnData.rate, returnData.mrp, now, returnData.barcode, returnData.return_date, returnData.userid, returnData.supplier_code]
      );
    } else {
      console.error("❌ Error saving return to sync:", error);
      throw error;
    }
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
    return result.changes || 0;
  } catch (error) {
    console.error('❌ Error cleaning up duplicate returns:', error);
    throw error;
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
  } catch (error) {
    console.error('❌ Error getting return stats:', error);
    return { total: 0, pending: 0, synced: 0, lastSynced: null, totalItems: 0 };
  }
};

// ============================================
// SALES FUNCTIONS
// ============================================

export const getPendingSalesOrders = async () => {
  const db = getDatabase();
  try {
    const sales = await db.getAllAsync(
      `SELECT s.*, COALESCE(s.product_name, p.name) as product_name
       FROM sales_to_sync s
       LEFT JOIN product_data p ON s.barcode = p.barcode
       WHERE s.sync_status = ?
       ORDER BY s.created_at ASC, s.id ASC`,
      ['pending']
    );
    return sales;
  } catch (error) {
    console.error("❌ Error getting pending sales:", error);
    return [];
  }
};

export const markSalesAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE sales_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Sales marked as synced");
  } catch (error) {
    console.error("❌ Error marking sales as synced:", error);
    throw error;
  }
};

export const saveSaleToSync = async (sale: {
  supplier_code: string;
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  sale_date: string;
  product_name?: string;
  is_manual_entry?: number;
  customer?: string;
  enclosures?: string;
  description?: string;
}) => {
  const db = getDatabase();
  try {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO sales_to_sync
       (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, sale_date, sales_date, product_name, is_manual_entry, customer, enclosures, description, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [sale.supplier_code, sale.userid, sale.itemcode, sale.barcode,
       sale.quantity, sale.rate, sale.mrp, sale.sale_date, sale.sale_date,
       sale.product_name || '', sale.is_manual_entry || 0,
       sale.customer || '', sale.enclosures || '', sale.description || '', now]
    );
  } catch (error) {
    console.error("❌ Error saving sale to sync:", error);
    throw error;
  }
};

export const saveSaleReturnToSync = async (sale: {
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  sale_date: string;
  sales_date?: string;
  product_name?: string;
  is_manual_entry?: number;
}) => {
  const db = getDatabase();
  try {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO sales_return_to_sync
       (userid, itemcode, barcode, quantity, rate, mrp, sales_date, product_name, is_manual_entry, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [sale.userid, sale.itemcode, sale.barcode,
       sale.quantity, sale.rate, sale.mrp, sale.sale_date || sale.sales_date || new Date().toISOString().split('T')[0],       sale.product_name || '', sale.is_manual_entry || 0, now]
    );
  } catch (error) {
    console.error("❌ Error saving sale return to sync:", error);
    throw error;
  }
};

export const getPendingSalesReturnOrders = async () => {
  const db = getDatabase();
  try {
    const returns = await db.getAllAsync(
      `SELECT s.*, COALESCE(s.product_name, p.name) as product_name
       FROM sales_return_to_sync s
       LEFT JOIN product_data p ON s.barcode = p.barcode
       WHERE s.sync_status = ?
       ORDER BY s.created_at ASC, s.id ASC`,
      ['pending']
    );
    return returns;
  } catch (error) {
    console.error("❌ Error getting pending sales returns:", error);
    return [];
  }
};

export const markSalesReturnsAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE sales_return_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ Sales returns marked as synced");
  } catch (error) {
    console.error("❌ Error marking sales returns as synced:", error);
    throw error;
  }
};
export const markSalesReturnAsSynced = markSalesReturnsAsSynced;


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
  } catch (error) {
    console.error("❌ Error clearing sync data:", error);
    throw error;
  }
};
// Fast save - frees valueRows string after each chunk to reduce memory pressure
export const saveMasterDataFast = async (data: any[]) => {
  const db = getDatabase();
  const escape = (v: any): string => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return isNaN(v) ? '0' : String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  };
  console.log(`⚡ Fast saving ${data.length} master records...`);
  const startTime = Date.now();
  const validData = data.filter(item => item.code && item.name);
  try {
    try { await db.execAsync('ROLLBACK;'); } catch (_) { }
    await db.execAsync('DELETE FROM master_data;');

    const CHUNK_SIZE = 500;
    for (let i = 0; i < validData.length; i += CHUNK_SIZE) {
      const chunk = validData.slice(i, i + CHUNK_SIZE);
      let valueRows = chunk.map((item: any) =>
        `(${escape(item.code)},${escape(item.name)},${escape(item.place)})`
    ).join(',');
      await db.execAsync(
        `INSERT OR REPLACE INTO master_data (code, name, place) VALUES ${valueRows};`
      );
      valueRows = ''; // free string immediately after insert
      console.log(`📊 Master fast progress: ${Math.min(i + CHUNK_SIZE, validData.length)}/${validData.length}`);
    }

    const verifyResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM master_data') as { count: number };
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⚡ Master fast saved: ${verifyResult?.count || 0} records in ${duration}s`);
  } catch (error) {
    console.error("❌ Error in fast master save:", error);
    throw error;
  }
};

export const saveProductDataFast = async (data: any[]) => {
  const db = getDatabase();
  const escape = (v: any): string => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return isNaN(v) ? '0' : String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  };
  console.log(`⚡ Fast saving ${data.length} product records...`);
  const startTime = Date.now();


  try {
    try { await db.execAsync('ROLLBACK;'); } catch (_) { }
    await db.execAsync('DELETE FROM product_data;');

    const CHUNK_SIZE = 500;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      let valueRows = chunk.map((item: any) => {
        const code = escape(item.code || item.product_code);
        const name = escape(item.name || item.product_name || 'Unknown');
        const barcode = escape(item.barcode || `CODE_${item.code}`);
        const qty = escape(typeof item.quantity === 'number' ? item.quantity : 0);
       const sp = escape(typeof item.salesprice === 'number' ? item.salesprice : 0);
        const bmrp = escape(typeof item.bmrp === 'number' ? item.bmrp : 0);
        const cost = escape(typeof item.cost === 'number' ? item.cost : 0);
        const batch = escape(item.batch_supplier);
        const pricesArray = item.prices || [];
        const S1 = escape(getPriceByCode(pricesArray, 'S1'));
        const S2 = escape(getPriceByCode(pricesArray, 'S2'));
        return `(${code},${name},${barcode},${qty},${sp},${bmrp},${cost},${batch},${S1},${S2})`;
        }).join(',');
        await db.execAsync(
          `INSERT OR REPLACE INTO product_data (code, name, barcode, quantity, salesprice, bmrp, cost, batch_supplier, S1, S2) VALUES ${valueRows};`
        );
      valueRows = ''; // free string immediately after insert
      console.log(`📊 Product fast progress: ${Math.min(i + CHUNK_SIZE, data.length)}/${data.length}`);
    }


    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⚡ Product fast saved: ${data.length} records in ${duration}s`);
    return { success: true, total: data.length };
  } catch (error) {
    console.error("❌ Error in fast product save:", error);
    throw error;
  }
};