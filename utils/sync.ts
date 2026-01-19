// utils/sync.ts - COMPLETE FIXED VERSION (Handles null barcodes)
import { getDatabase } from "./database";

// Save master data
export const saveMasterData = async (data: any[]) => {
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
    console.log(`✅ Saved ${data.length} master records`);
  } catch (error) {
    console.error("❌ Error saving master data:", error);
    throw error;
  }
};

// 🔥 FIXED: Save product data handling null barcodes
export const saveProductData = async (data: any[]) => {
  const db = getDatabase();
  
  console.log(`📦 Starting to save ${data.length} products...`);
  
  try {
    let savedCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    await db.withTransactionAsync(async () => {
      // Clear existing products first to avoid duplicates/conflicts
      console.log('🗑️ Clearing existing product data...');
      await db.runAsync('DELETE FROM product_data');
      console.log('✅ Existing product data cleared');
      
      // Now insert all products fresh
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        try {
          const batchSupplier = item.batch_supplier || item.supplier || item.batch_supplier_name || null;
          
          // Validate required fields
          const code = item.code || item.product_code;
          let barcode = item.barcode;
          
          // 🔥 FIX: Handle null barcodes by using code as fallback or generating unique value
          if (!barcode || barcode === null || barcode === '') {
            // Option 1: Use code as barcode if available
            if (code) {
              barcode = `CODE_${code}`;
            } else {
              // Option 2: Skip if no code and no barcode
              console.warn(`⚠️ Skipping product ${i + 1}: Missing both code and barcode`, item);
              skippedCount++;
              continue;
            }
          }
          
          if (!code) {
            console.warn(`⚠️ Skipping product ${i + 1}: Missing code`, item);
            skippedCount++;
            continue;
          }
          
          await db.runAsync(
            `INSERT INTO product_data 
             (code, name, barcode, quantity, salesprice, bmrp, cost, batch_supplier) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              code,
              item.name || item.product_name || 'Unknown',
              barcode, // Now guaranteed to be unique
              item.quantity || item.stock || 0,
              item.salesprice || item.selling_price || 0,
              item.bmrp || item.mrp || 0,
              item.cost || item.purchase_price || 0,
              batchSupplier
            ]
          );
          
          savedCount++;
        } catch (itemError: any) {
          console.error(`❌ Error saving product ${i + 1}:`, itemError.message);
          errors.push({ index: i, item, error: itemError.message });
          skippedCount++;
        }
      }
    });
    
    console.log(`✅ Product save completed:`, {
      total: data.length,
      saved: savedCount,
      skipped: skippedCount,
      errors: errors.length
    });
    
    if (errors.length > 0) {
      console.error('❌ Products that failed to save:', errors.slice(0, 5)); // Show first 5 errors
    }
    
    // Verify the count in database
    const verifyResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM product_data') as {count: number};
    console.log(`🔍 Verification: ${verifyResult?.count || 0} products in database`);
    
    if (verifyResult?.count !== savedCount) {
      console.warn(`⚠️ COUNT MISMATCH! Expected ${savedCount}, found ${verifyResult?.count}`);
    }
    
    return {
      success: true,
      saved: savedCount,
      skipped: skippedCount,
      total: data.length
    };
    
  } catch (error) {
    console.error("❌ Error saving product data:", error);
    throw error;
  }
};

// Get local data statistics
export const getLocalDataStats = async () => {
  const db = getDatabase();
  try {
    const masterCountResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM master_data') as {count: number};
    const productCountResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM product_data') as {count: number};
    const pendingOrdersResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM orders_to_sync WHERE sync_status = ?', ['pending']) as {count: number};
    const lastSyncedResult = await db.getFirstAsync('SELECT last_synced FROM sync_info WHERE id = 1') as {last_synced: string} | null;

    return {
      masterCount: masterCountResult?.count || 0,
      productCount: productCountResult?.count || 0,
      pendingOrders: pendingOrdersResult?.count || 0,
      lastSynced: lastSyncedResult?.last_synced || null
    };
  } catch (error) {
    console.error("❌ Error getting local stats:", error);
    return {
      masterCount: 0,
      productCount: 0,
      pendingOrders: 0,
      lastSynced: null
    };
  }
};

// ============================================
// ORDERS FUNCTIONS
// ============================================

// Get pending orders with correct product_name handling
export const getPendingOrders = async () => {
  const db = getDatabase();
  try {
    const orders = await db.getAllAsync(
      `SELECT 
         o.*,
         COALESCE(o.product_name, p.name) as product_name
       FROM orders_to_sync o 
       LEFT JOIN product_data p ON o.barcode = p.barcode 
       WHERE o.sync_status = ? 
       ORDER BY o.created_at`,
      ['pending']
    );
    
    console.log("\n🔍 === getPendingOrders() DEBUG ===");
    console.log(`Total orders fetched: ${orders.length}`);
    
    const manualEntries = orders.filter((o: any) => o.is_manual_entry === 1);
    if (manualEntries.length > 0) {
      console.log(`\nManual entries (${manualEntries.length}):`);
      manualEntries.forEach((entry: any, idx: number) => {
        console.log(`  ${idx + 1}. barcode: ${entry.barcode}`);
        console.log(`     product_name: "${entry.product_name}"`);
        console.log(`     is_manual_entry: ${entry.is_manual_entry}`);
      });
    }
    console.log("🔍 === END DEBUG ===\n");
    
    return orders;
  } catch (error) {
    console.error("❌ Error getting pending orders:", error);
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
  } catch (error) {
    console.error("❌ Error marking orders as synced:", error);
    throw error;
  }
};

// Save order to sync
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
    // Check if order already exists for same date, barcode, user, and supplier
    const existingOrder = await db.getFirstAsync(
      `SELECT id, quantity FROM orders_to_sync 
       WHERE barcode = ? AND order_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [order.barcode, order.order_date, order.userid, order.supplier_code]
    ) as any;

    if (existingOrder) {
      // Update existing order with new quantity (accumulate)
      const newQuantity = (existingOrder.quantity || 0) + order.quantity;
      
      await db.runAsync(
        `UPDATE orders_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, created_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, order.rate, order.mrp, existingOrder.id]
      );
      
      console.log("✅ Updated existing order quantity:", {
        barcode: order.barcode,
        oldQuantity: existingOrder.quantity,
        newQuantity: newQuantity
      });
    } else {
      // Insert new order
      await db.runAsync(
        `INSERT INTO orders_to_sync 
         (supplier_code, userid, barcode, quantity, rate, mrp, order_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [order.supplier_code, order.userid, order.barcode, order.quantity, order.rate, order.mrp, order.order_date]
      );
      
      console.log("✅ New order saved for sync:", {
        barcode: order.barcode,
        quantity: order.quantity
      });
    }
  } catch (error: any) {
    // Handle unique constraint violation gracefully
    if (error.message?.includes('UNIQUE constraint failed')) {
      console.log("⚠️ Order already exists, updating instead...");
      
      // Try to update existing order
      await db.runAsync(
        `UPDATE orders_to_sync 
         SET quantity = quantity + ?, rate = ?, mrp = ?, created_at = CURRENT_TIMESTAMP 
         WHERE barcode = ? AND order_date = ? AND userid = ? AND supplier_code = ?`,
        [order.quantity, order.rate, order.mrp, order.barcode, order.order_date, order.userid, order.supplier_code]
      );
      
      console.log("✅ Updated existing order after constraint violation");
    } else {
      console.error("❌ Error saving order to sync:", error);
      throw error;
    }
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
    console.log("✅ Last sync timestamp updated:", now);
  } catch (error) {
    console.error("❌ Error updating sync timestamp:", error);
    throw error;
  }
};

// Clean up duplicate orders function
export const cleanupDuplicateOrders = async () => {
  const db = getDatabase();
  try {
    console.log("🧹 Cleaning up duplicate orders...");
    
    // Find and merge duplicate orders
    const duplicates = await db.getAllAsync(`
      SELECT barcode, order_date, userid, supplier_code, 
             COUNT(*) as duplicate_count,
             GROUP_CONCAT(id) as order_ids,
             SUM(quantity) as total_quantity
      FROM orders_to_sync 
      WHERE sync_status = 'pending'
      GROUP BY barcode, order_date, userid, supplier_code
      HAVING COUNT(*) > 1
    `) as any[];

    console.log(`Found ${duplicates.length} sets of duplicates to clean up`);

    for (const duplicate of duplicates) {
      const orderIds = duplicate.order_ids.split(',').map((id: string) => parseInt(id));
      
      // Keep the first order and delete the rest
      const orderIdToKeep = orderIds[0];
      const orderIdsToDelete = orderIds.slice(1);
      
      // Update the kept order with the total quantity
      await db.runAsync(
        `UPDATE orders_to_sync 
         SET quantity = ? 
         WHERE id = ?`,
        [duplicate.total_quantity, orderIdToKeep]
      );
      
      // Delete the duplicate orders
      if (orderIdsToDelete.length > 0) {
        const placeholders = orderIdsToDelete.map(() => '?').join(',');
        await db.runAsync(
          `DELETE FROM orders_to_sync 
           WHERE id IN (${placeholders})`,
          orderIdsToDelete
        );
      }
      
      console.log(`✅ Merged ${duplicate.duplicate_count} duplicates for barcode: ${duplicate.barcode}`);
    }
    
    return duplicates.length;
  } catch (error) {
    console.error("❌ Error cleaning up duplicate orders:", error);
    throw error;
  }
};

// ============================================
// GRN FUNCTIONS
// ============================================

// Get pending GRN orders
export const getPendingGRNOrders = async () => {
  const db = getDatabase();
  try {
    const orders = await db.getAllAsync(
      `SELECT 
         o.*,
         COALESCE(o.product_name, p.name) as product_name
       FROM grn_to_sync o 
       LEFT JOIN product_data p ON o.barcode = p.barcode 
       WHERE o.sync_status = ? 
       ORDER BY o.created_at`,
      ['pending']
    );
    
    console.log("\n🔍 === getPendingGRNOrders() DEBUG ===");
    console.log(`Total GRN orders fetched: ${orders.length}`);
    
    const manualEntries = orders.filter((o: any) => o.is_manual_entry === 1);
    if (manualEntries.length > 0) {
      console.log(`\nManual GRN entries (${manualEntries.length}):`);
      manualEntries.forEach((entry: any, idx: number) => {
        console.log(`  ${idx + 1}. barcode: ${entry.barcode}`);
        console.log(`     product_name: "${entry.product_name}"`);
        console.log(`     is_manual_entry: ${entry.is_manual_entry}`);
      });
    }
    console.log("🔍 === END DEBUG ===\n");
    
    return orders;
  } catch (error) {
    console.error("❌ Error getting pending GRN orders:", error);
    return [];
  }
};

// Mark GRN orders as synced
export const markGRNOrdersAsSynced = async () => {
  const db = getDatabase();
  try {
    await db.runAsync(
      'UPDATE grn_to_sync SET sync_status = ? WHERE sync_status = ?',
      ['synced', 'pending']
    );
    console.log("✅ GRN orders marked as synced");
  } catch (error) {
    console.error("❌ Error marking GRN orders as synced:", error);
    throw error;
  }
};

// Save GRN order to sync
export const saveGRNOrderToSync = async (order: {
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
}) => {
  const db = getDatabase();
  try {
    // Check if GRN order already exists
    const existingOrder = await db.getFirstAsync(
      `SELECT id, quantity FROM grn_to_sync 
       WHERE barcode = ? AND grn_date = ? AND userid = ? AND supplier_code = ? 
       AND sync_status = 'pending'`,
      [order.barcode, order.grn_date, order.userid, order.supplier_code]
    ) as any;

    if (existingOrder) {
      const newQuantity = (existingOrder.quantity || 0) + order.quantity;
      
      await db.runAsync(
        `UPDATE grn_to_sync 
         SET quantity = ?, rate = ?, mrp = ?, created_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newQuantity, order.rate, order.mrp, existingOrder.id]
      );
      
      console.log("✅ Updated existing GRN order quantity:", {
        barcode: order.barcode,
        oldQuantity: existingOrder.quantity,
        newQuantity: newQuantity
      });
    } else {
      await db.runAsync(
        `INSERT INTO grn_to_sync 
         (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, grn_date, product_name, is_manual_entry, sync_status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
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
          order.is_manual_entry || 0
        ]
      );
      
      console.log("✅ New GRN order saved for sync:", {
        barcode: order.barcode,
        quantity: order.quantity
      });
    }
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      console.log("⚠️ GRN order already exists, updating instead...");
      
      await db.runAsync(
        `UPDATE grn_to_sync 
         SET quantity = quantity + ?, rate = ?, mrp = ?, created_at = CURRENT_TIMESTAMP 
         WHERE barcode = ? AND grn_date = ? AND userid = ? AND supplier_code = ?`,
        [order.quantity, order.rate, order.mrp, order.barcode, order.grn_date, order.userid, order.supplier_code]
      );
      
      console.log("✅ Updated existing GRN order after constraint violation");
    } else {
      console.error("❌ Error saving GRN order to sync:", error);
      throw error;
    }
  }
};

// Clean up duplicate GRN orders
export const cleanupDuplicateGRNOrders = async () => {
  const db = getDatabase();
  try {
    console.log("🧹 Cleaning up duplicate GRN orders...");
    
    const duplicates = await db.getAllAsync(`
      SELECT barcode, grn_date, userid, supplier_code, 
             COUNT(*) as duplicate_count,
             GROUP_CONCAT(id) as order_ids,
             SUM(quantity) as total_quantity
      FROM grn_to_sync 
      WHERE sync_status = 'pending'
      GROUP BY barcode, grn_date, userid, supplier_code
      HAVING COUNT(*) > 1
    `) as any[];

    console.log(`Found ${duplicates.length} sets of GRN duplicates to clean up`);

    for (const duplicate of duplicates) {
      const orderIds = duplicate.order_ids.split(',').map((id: string) => parseInt(id));
      const orderIdToKeep = orderIds[0];
      const orderIdsToDelete = orderIds.slice(1);
      
      await db.runAsync(
        `UPDATE grn_to_sync 
         SET quantity = ? 
         WHERE id = ?`,
        [duplicate.total_quantity, orderIdToKeep]
      );
      
      if (orderIdsToDelete.length > 0) {
        const placeholders = orderIdsToDelete.map(() => '?').join(',');
        await db.runAsync(
          `DELETE FROM grn_to_sync 
           WHERE id IN (${placeholders})`,
          orderIdsToDelete
        );
      }
      
      console.log(`✅ Merged ${duplicate.duplicate_count} GRN duplicates for barcode: ${duplicate.barcode}`);
    }
    
    return duplicates.length;
  } catch (error) {
    console.error("❌ Error cleaning up duplicate GRN orders:", error);
    throw error;
  }
};

// Get local GRN data stats
export const getLocalGRNDataStats = async () => {
  const db = getDatabase();
  try {
    const pendingGRNResult = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM grn_to_sync WHERE sync_status = ?', 
      ['pending']
    ) as {count: number};
    
    const lastSyncedGRNResult = await db.getFirstAsync(
      'SELECT MAX(created_at) as last_sync FROM grn_to_sync WHERE sync_status = ?',
      ['synced']
    ) as {last_sync: string} | null;

    return {
      pendingCount: pendingGRNResult?.count || 0,
      lastSynced: lastSyncedGRNResult?.last_sync || null
    };
  } catch (error) {
    console.error("❌ Error getting local GRN stats:", error);
    return {
      pendingCount: 0,
      lastSynced: null
    };
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Clear all sync data (for testing/reset)
export const clearAllSyncData = async () => {
  const db = getDatabase();
  try {
    await db.runAsync('DELETE FROM orders_to_sync');
    await db.runAsync('DELETE FROM grn_to_sync');
    await db.runAsync('DELETE FROM sync_info');
    console.log("✅ All sync data cleared");
  } catch (error) {
    console.error("❌ Error clearing sync data:", error);
    throw error;
  }
};

// Run initial cleanup (optional)
export const runInitialCleanup = async () => {
  try {
    const ordersCleanedCount = await cleanupDuplicateOrders();
    const grnCleanedCount = await cleanupDuplicateGRNOrders();
    
    if (ordersCleanedCount > 0) {
      console.log(`✅ Cleaned up ${ordersCleanedCount} sets of duplicate orders`);
    }
    if (grnCleanedCount > 0) {
      console.log(`✅ Cleaned up ${grnCleanedCount} sets of duplicate GRN orders`);
    }
    
    return { orders: ordersCleanedCount, grn: grnCleanedCount };
  } catch (error) {
    console.error("❌ Initial cleanup failed:", error);
    return { orders: 0, grn: 0 };
  }
};