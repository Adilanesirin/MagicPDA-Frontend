// utils/sync.ts - Enhanced version with better error handling and connection management

import { closeDatabase, getDatabase } from "./database";

// Add this function to reset database connection
export const resetDatabaseConnection = async () => {
  closeDatabase();
  console.log("✅ Database connection reset");
};

// Enhanced database health check
export const checkDatabaseHealth = async () => {
  try {
    const db = getDatabase();
    await db.getFirstAsync("SELECT 1");
    return true;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    // Try to reset connection
    await resetDatabaseConnection();
    return false;
  }
};

// Enhanced saveMasterData with connection management
export const saveMasterData = async (data: any[]) => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ No master data to save or invalid data format");
      return;
    }

    console.log(`💾 Saving ${data.length} master records...`);

    // Check database health first
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error("Database connection is not healthy");
    }

    const db = getDatabase();
    
    // Add retry logic for database operations
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await db.withTransactionAsync(async () => {
          // Clear existing data first
          await db.runAsync("DELETE FROM master_data");
          console.log("✅ Cleared existing master data");

          // Insert new data in batches to avoid memory issues
          const batchSize = 100;
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            for (const item of batch) {
              if (!item.code) {
                console.warn("⚠️ Skipping master item without code:", item);
                continue;
              }

              await db.runAsync(
                "INSERT OR REPLACE INTO master_data (code, name, place) VALUES (?, ?, ?)",
                [item.code, item.name || "", item.place || ""]
              );
            }
            
            // Small delay between batches
            if (i + batchSize < data.length) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
        });
        
        console.log(`✅ Master data saved successfully: ${data.length} records`);
        return; // Success, exit retry loop
        
      } catch (error: any) {
        retryCount++;
        console.error(`❌ Attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        // Reset database connection before retry
        await resetDatabaseConnection();
        
        // Wait before retry with exponential backoff
        const delay = 1000 * Math.pow(2, retryCount - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

  } catch (error: any) {
    console.error("❌ Error saving master data:", error);
    throw new Error(`Failed to save master data: ${error.message}`);
  }
};

// Enhanced saveProductData with connection management
export const saveProductData = async (data: any[]) => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ No product data to save or invalid data format");
      return;
    }

    console.log(`💾 Saving ${data.length} product records...`);

    // Check database health first
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error("Database connection is not healthy");
    }

    const db = getDatabase();
    
    // Add retry logic for database operations
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await db.withTransactionAsync(async () => {
          // Clear existing data first
          await db.runAsync("DELETE FROM product_data");
          console.log("✅ Cleared existing product data");

          // Insert new data in batches
          const batchSize = 100;
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            for (const item of batch) {
              if (!item.barcode) {
                console.warn("⚠️ Skipping product item without barcode:", item);
                continue;
              }

              await db.runAsync(
                "INSERT OR REPLACE INTO product_data (code, name, barcode, quantity, salesprice, bmrp, cost) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                  item.code || "",
                  item.name || "",
                  item.barcode,
                  item.quantity || 0,
                  item.salesprice || 0,
                  item.bmrp || 0,
                  item.cost || 0
                ]
              );
            }
            
            // Small delay between batches
            if (i + batchSize < data.length) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
        });
        
        console.log(`✅ Product data saved successfully: ${data.length} records`);
        return; // Success, exit retry loop
        
      } catch (error: any) {
        retryCount++;
        console.error(`❌ Attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        // Reset database connection before retry
        await resetDatabaseConnection();
        
        // Wait before retry with exponential backoff
        const delay = 1000 * Math.pow(2, retryCount - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

  } catch (error: any) {
    console.error("❌ Error saving product data:", error);
    throw new Error(`Failed to save product data: ${error.message}`);
  }
};

// Add database cleanup function
export const cleanupDatabase = async () => {
  try {
    const db = getDatabase();
    // Close any pending transactions
    try {
      await db.execAsync("ROLLBACK");
    } catch (error) {
      // Ignore rollback errors if no transaction is active
    }
    
    try {
      // Unlock database
      await db.execAsync("BEGIN IMMEDIATE; ROLLBACK;");
      console.log("✅ Database cleanup completed");
    } catch (error) {
      console.error("❌ Database cleanup failed:", error);
    }
  } catch (error) {
    console.error("❌ Error accessing database for cleanup:", error);
  }
};

// Enhanced clearDownloadCache with cleanup
export const clearDownloadCache = async () => {
  try {
    const db = getDatabase();
    // Cleanup first
    await cleanupDatabase();
    
    // Clear cache
    await db.execAsync("DELETE FROM sync_info");
    console.log("✅ Download cache cleared");
  } catch (error) {
    console.error("❌ Error clearing download cache:", error);
    throw error;
  }
};

// Rest of the functions remain the same but use getDatabase() instead of direct db import...
// Update all functions to use getDatabase() instead of the direct db import

export const updateLastSynced = async () => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // First try to update existing record
    const result = await db.runAsync(
      "UPDATE sync_info SET last_synced = ? WHERE id = 1",
      [now]
    );

    // If no rows were updated, insert new record
    if (result.changes === 0) {
      await db.runAsync(
        "INSERT INTO sync_info (id, last_synced) VALUES (1, ?)",
        [now]
      );
    }

    console.log("✅ Last sync timestamp updated:", now);
  } catch (error) {
    console.error("❌ Error updating last sync timestamp:", error);
  }
};

export const getLocalDataStats = async () => {
  try {
    const db = getDatabase();
    const masterCountResult = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM master_data"
    );
    const productCountResult = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM product_data"
    );
    const lastSyncedResult = await db.getFirstAsync<{ last_synced: string }>(
      "SELECT last_synced FROM sync_info WHERE id = 1"
    );

    return {
      masterCount: masterCountResult?.count || 0,
      productCount: productCountResult?.count || 0,
      lastSynced: lastSyncedResult?.last_synced || null
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

export const getLastSyncTime = async () => {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ last_synced: string }>(
      "SELECT last_synced FROM sync_info WHERE id = 1"
    );
    return result?.last_synced || null;
  } catch (error) {
    console.error("❌ Error getting last sync time:", error);
    return null;
  }
};

// ===== UPLOAD/ORDER FUNCTIONS =====
export const saveOrderToSync = async (orderData: {
  supplier_code: string;
  userid: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  order_date: string;
}) => {
  try {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO orders_to_sync 
       (supplier_code, userid, barcode, quantity, rate, mrp, order_date, sync_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderData.supplier_code,
        orderData.userid,
        orderData.barcode,
        orderData.quantity,
        orderData.rate,
        orderData.mrp,
        orderData.order_date
      ]
    );

    console.log("✅ Order saved for sync:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("❌ Error saving order for sync:", error);
    throw error;
  }
};

export const getPendingOrders = async (): Promise<any[]> => {
  try {
    const db = getDatabase();
    const orders = await db.getAllAsync(`
      SELECT * FROM orders_to_sync 
      WHERE sync_status = 'pending' 
      ORDER BY created_at DESC
    `);
    return orders;
  } catch (error) {
    console.error("❌ Error getting pending orders:", error);
    return [];
  }
};

export const markOrdersAsSynced = async () => {
  try {
    const db = getDatabase();
    const result = await db.runAsync(
      "UPDATE orders_to_sync SET sync_status = 'synced' WHERE sync_status = 'pending'"
    );
    console.log(`✅ Marked ${result.changes} orders as synced`);
    return result.changes;
  } catch (error) {
    console.error("❌ Error marking orders as synced:", error);
    throw error;
  }
};

export const clearAllPendingOrders = async () => {
  try {
    const db = getDatabase();
    const result = await db.runAsync("DELETE FROM orders_to_sync WHERE sync_status = 'pending'");
    console.log(`✅ Cleared ${result.changes} pending orders`);
    return result.changes;
  } catch (error) {
    console.error("❌ Error clearing pending orders:", error);
    throw error;
  }
};

export const getOrderStats = async () => {
  try {
    const db = getDatabase();
    const pendingCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM orders_to_sync WHERE sync_status = 'pending'"
    );
    const syncedCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM orders_to_sync WHERE sync_status = 'synced'"
    );

    return {
      pending: pendingCount?.count || 0,
      synced: syncedCount?.count || 0,
      total: (pendingCount?.count || 0) + (syncedCount?.count || 0)
    };
  } catch (error) {
    console.error("❌ Error getting order stats:", error);
    return { pending: 0, synced: 0, total: 0 };
  }
};

// ===== BACKUP & RECOVERY FUNCTIONS =====
export const backupData = async () => {
  try {
    const db = getDatabase();
    const masterData = await db.getAllAsync<{ code: string; name: string; place: string }>(
      "SELECT * FROM master_data"
    );
    const productData = await db.getAllAsync<{
      code: string;
      name: string;
      barcode: string;
      quantity: number;
      salesprice: number;
      bmrp: number;
      cost: number;
    }>("SELECT * FROM product_data");

    return {
      masterData,
      productData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error backing up data:", error);
    return null;
  }
};

export const restoreData = async (backup: { masterData: any[]; productData: any[] }) => {
  try {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      // Clear existing data
      await db.runAsync("DELETE FROM master_data");
      await db.runAsync("DELETE FROM product_data");

      // Restore master data
      for (const item of backup.masterData) {
        await db.runAsync(
          "INSERT INTO master_data (code, name, place) VALUES (?, ?, ?)",
          [item.code, item.name, item.place]
        );
      }

      // Restore product data
      for (const item of backup.productData) {
        await db.runAsync(
          "INSERT INTO product_data (code, name, barcode, quantity, salesprice, bmrp, cost) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [item.code, item.name, item.barcode, item.quantity, item.salesprice, item.bmrp, item.cost]
        );
      }
    });

    console.log("✅ Data restored from backup");
    return true;
  } catch (error) {
    console.error("❌ Error restoring data:", error);
    return false;
  }
};

// ===== DATABASE MAINTENANCE =====
export const optimizeDatabase = async () => {
  try {
    const db = getDatabase();
    await db.execAsync("VACUUM");
    console.log("✅ Database optimized");
  } catch (error) {
    console.error("❌ Error optimizing database:", error);
  }
};

export const resetDatabaseSafe = async () => {
  try {
    const db = getDatabase();
    // Cleanup first
    await cleanupDatabase();
    
    await db.withTransactionAsync(async () => {
      await db.execAsync("DELETE FROM master_data");
      await db.execAsync("DELETE FROM product_data");
      await db.execAsync("DELETE FROM orders_to_sync");
      await db.execAsync("DELETE FROM sync_info");
    });
    
    console.log("✅ Database reset complete");
    return true;
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    return false;
  }
};

// ===== UTILITY FUNCTIONS =====
export const getDatabaseSize = async () => {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ size: number }>(
      "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
    );
    return result?.size || 0;
  } catch (error) {
    console.error("❌ Error getting database size:", error);
    return 0;
  }
};

export const exportDatabase = async () => {
  try {
    const db = getDatabase();
    const masterData = await db.getAllAsync("SELECT * FROM master_data");
    const productData = await db.getAllAsync("SELECT * FROM product_data");
    const orders = await db.getAllAsync("SELECT * FROM orders_to_sync");
    const syncInfo = await db.getAllAsync("SELECT * FROM sync_info");

    return {
      masterData,
      productData,
      orders,
      syncInfo,
      exportDate: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error exporting database:", error);
    return null;
  }
};