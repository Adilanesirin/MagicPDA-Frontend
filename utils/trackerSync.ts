// utils/trackerSync.ts
import { createEnhancedAPI } from "@/utils/api";
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("magicpedia.db");

interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  batch: number;
  totalBatches: number;
}

export async function syncProductsWithPagination(
  onProgress?: (progress: SyncProgress) => void
) {
  console.log('🚀 Starting paginated product sync...');
  
  try {
    const api = await createEnhancedAPI();
    
    // Get total count
    console.log('📊 Fetching total product count...');
    const countResponse = await api.get("/product-details", {
      params: { limit: 1, _t: Date.now() },
      timeout: 10000
    });
    
    const totalProducts = countResponse.data?.count || 0;
    console.log(`📊 Total products to sync: ${totalProducts}`);
    
    if (totalProducts === 0) {
      throw new Error("No products found on server");
    }
    
    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await db.runAsync('DELETE FROM product_data');
    await db.runAsync('DELETE FROM sqlite_sequence WHERE name="product_data"');
    
    // Download in batches
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(totalProducts / BATCH_SIZE);
    let syncedCount = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * BATCH_SIZE;
      const batchNumber = batchIndex + 1;
      
      // Update progress
      if (onProgress) {
        onProgress({
          current: offset,
          total: totalProducts,
          percentage: Math.round((offset / totalProducts) * 100),
          batch: batchNumber,
          totalBatches: totalBatches
        });
      }
      
      console.log(`📦 Batch ${batchNumber}/${totalBatches} (offset: ${offset})...`);
      
      // Download batch
      const response = await api.get("/product-details", {
        params: {
          offset,
          limit: BATCH_SIZE,
          _t: Date.now()
        },
        timeout: 30000
      });
      
      const batchProducts = response.data?.data || [];
      
      if (batchProducts.length > 0) {
        // Save batch
        await saveProductBatch(batchProducts);
        syncedCount += batchProducts.length;
        
        console.log(`✅ Batch ${batchNumber}: Saved ${batchProducts.length} products (Total: ${syncedCount}/${totalProducts})`);
      }
      
      // Small delay to prevent overwhelming
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Final progress
    if (onProgress) {
      onProgress({
        current: totalProducts,
        total: totalProducts,
        percentage: 100,
        batch: totalBatches,
        totalBatches: totalBatches
      });
    }
    
    console.log(`🎉 Sync complete! ${syncedCount} products saved`);
    
    // Verify count
    const verifyResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM product_data');
    console.log(`📊 Database verification: ${verifyResult?.count || 0} products`);
    
    return { success: true, count: syncedCount };
    
  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Optimized batch save with INSERT OR REPLACE
async function saveProductBatch(products: any[]) {
  if (products.length === 0) return;
  
  // Use INSERT OR REPLACE to handle duplicates
  const placeholders = products.map(() => 
    '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).join(',');
  
  const values = products.flatMap(item => {
    const pricesArray = item.prices || [];
    
    // API uses 'catagory' (misspelled), NOT 'category'
    const categoryValue = item.catagory || '';
    const productTypeValue = item.product || '';
    
    // Extract prices
    const getPrice = (code: string) => {
      if (!Array.isArray(pricesArray)) return 0;
      const price = pricesArray.find((p: any) => p?.price_code === code);
      return price ? parseFloat(price.value) || 0 : 0;
    };
    
    const CO = getPrice('CO');
    const MR = getPrice('MR');
    const S1 = getPrice('S1');
    const S2 = getPrice('S2');
    
    // Handle barcode - can have spaces and colons
    const barcode = item.barcode ? String(item.barcode).trim() : `CODE_${item.code}`;
    
    return [
      // Core fields (12)
      String(item.code || '').trim(),
      String(item.name || 'Unknown').trim(),
      categoryValue,
      String(productTypeValue).trim(),
      String(item.brand || '').trim(),
      String(item.unit || '').trim(),
      String(item.taxcode || '0').trim(),
      String(item.productcode || '').trim(),
      barcode,
      Number(item.quantity || 0),
      item.supplier || null,
      item.expirydate || null,
      
      // Prices JSON
      JSON.stringify(pricesArray),
      
      // Derived fields (7)
      CO,  // cost
      MR,  // bmrp
      CO,  // CO
      MR,  // MR
      S1,  // S1
      S2,  // S2
      String(item.batch_supplier || item.supplier || '').trim(),
      
      // Extra fields (5)
      Number(item.salesprice || item.selling_price || S1 || 0),
      Number(item.salesrate || S1 || 0),
      Number(item.mrp || MR || 0),
      Number(item.purchaseprice || item.purchase_price || CO || 0),
      Number(item.purchase_rate || CO || 0)
    ];
  });
  
  // INSERT OR REPLACE - THIS ELIMINATES DUPLICATE ERRORS
  await db.runAsync(
    `INSERT OR REPLACE INTO product_data (
      code, name, catagory, product, brand, unit, taxcode, productcode,
      barcode, quantity, supplier, expirydate, prices_json,
      cost, bmrp, CO, MR, S1, S2, batch_supplier,
      salesprice, salesrate, mrp, purchaseprice, purchase_rate
    ) VALUES ${placeholders}`,
    values
  );
}

// Get sync status
export async function getSyncStatus() {
  try {
    const result = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM product_data'
    ) as { count: number };
    return { count: result?.count || 0 };
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    return { count: 0 };
  }
}