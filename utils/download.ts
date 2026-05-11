// utils/download.ts - COMPLETE VERSION WITH BOTH ENDPOINTS
import { createDownloadAPI } from "@/utils/api";
import {
  getLocalDataStats,
  saveMasterData,
  saveProductData
} from "@/utils/sync";
import * as SecureStore from "expo-secure-store";

// Download state management
let downloadState = {
  isInProgress: false,
  lastError: null as string | null,
  startTime: null as number | null,
  endTime: null as number | null
};

// Get current download status
export const getDownloadStatus = () => {
  return {
    isInProgress: downloadState.isInProgress,
    lastError: downloadState.lastError,
    startTime: downloadState.startTime,
    endTime: downloadState.endTime,
    duration: downloadState.startTime && downloadState.endTime 
      ? downloadState.endTime - downloadState.startTime 
      : null
  };
};

// Reset download state
export const resetDownloadState = async () => {
  try {
    console.log("🔄 Resetting download state...");
    downloadState = {
      isInProgress: false,
      lastError: null,
      startTime: null,
      endTime: null
    };
    console.log("✅ Download state reset successfully");
  } catch (error) {
    console.error("❌ Error resetting download state:", error);
    throw error;
  }
};

// Clear download artifacts
export const clearDownloadArtifacts = async () => {
  try {
    console.log("🧹 Clearing download artifacts...");
    downloadState.lastError = null;
    console.log("✅ Download artifacts cleared");
  } catch (error) {
    console.error("❌ Error clearing download artifacts:", error);
    throw error;
  }
};

// Check authentication status
export const checkAuthenticationStatus = async () => {
  try {
    console.log("🔍 Checking authentication status...");
    
    const tokenChecks = {
      access_token: await SecureStore.getItemAsync('access_token'),
      token: await SecureStore.getItemAsync('token'),
      refresh_token: await SecureStore.getItemAsync('refresh_token'),
      user_id: await SecureStore.getItemAsync('user_id')
    };
    
    console.log("🔍 Detailed Token Check:", {
      access_token: tokenChecks.access_token ? `EXISTS (${tokenChecks.access_token.length} chars)` : 'NOT FOUND',
      token: tokenChecks.token ? `EXISTS (${tokenChecks.token.length} chars)` : 'NOT FOUND', 
      refresh_token: tokenChecks.refresh_token ? 'EXISTS' : 'NOT FOUND',
      user_id: tokenChecks.user_id ? `EXISTS: ${tokenChecks.user_id}` : 'NOT FOUND'
    });
    
    let accessToken = tokenChecks.token || tokenChecks.access_token;
    
    console.log("🔍 Final Auth Status:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!tokenChecks.refresh_token,
      accessTokenLength: accessToken?.length || 0,
      tokenSource: tokenChecks.token ? 'token' : tokenChecks.access_token ? 'access_token' : 'none'
    });
    
    if (!accessToken) {
      throw new Error("No access token found. Please login again.");
    }
    
    return { accessToken, refreshToken: tokenChecks.refresh_token };
  } catch (error) {
    console.error("❌ Authentication check failed:", error);
    throw error;
  }
};

export const downloadFirmInfo = async () => {
  try {
    const api = await createDownloadAPI();
    const res = await api.get(`/misel?cb=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache" },
      timeout: 30000,
    });
    const data = res?.data;
    const firm = Array.isArray(data?.data) ? data.data[0] : null;
    if (firm) {
      await SecureStore.setItemAsync("firm_info", JSON.stringify(firm));
      console.log("✅ Firm info saved:", firm.firm_name);
    }
    return firm;
  } catch (error: any) {
    console.warn("⚠️ Could not fetch firm info:", error?.message);
    return null;
  }
};

// Download from any endpoint with authentication
export async function downloadFromEndpointWithAuth(path: string) {
  try {
    console.log("🌐 Downloading from endpoint:", path);
    
    // Check authentication first
    await checkAuthenticationStatus();
    
    const api = await createDownloadAPI();
    const url = `${path}?cb=${Date.now()}`;
    
    console.log("📤 Request:", api.defaults?.baseURL + url);
    
    const res = await api.get(url, { 
      headers: { "Cache-Control": "no-cache" }, 
      timeout: 120000 
    });
    
    if (!res || !res.data) {
      throw new Error("Empty response from server");
    }
    
    console.log("📥 Response status:", res.status);
    
    if (res.status === 401 || (res.data && res.data.detail === "Token missing")) {
      throw new Error("Authentication failed. Please login again.");
    }
    
    return res.data;
  } catch (error: any) {
    console.error(`❌ Download failed from ${path}:`, error?.message);
    
    if (error?.response?.status === 401 || error?.message?.includes("Token missing")) {
      throw new Error("Authentication failed. Please login again.");
    }
    
    throw error;
  }
}

// Process master data from /data-download endpoint
function processMasterData(data: any): any[] {
  try {
    console.log("🔍 Processing master data...");
    
    let actualData = data;
    
    // Unwrap nested data
    if (data.data && typeof data.data === 'object') {
      actualData = data.data;
    } else if (data.result && typeof data.result === 'object') {
      actualData = data.result;
    }

    // Find master data in various possible formats
    const masterVariations = [
      actualData.masterData,
      actualData.master,
      actualData.masters,
      actualData.master_data,
      actualData.suppliers,
      actualData.vendor,
      actualData.vendors,
      actualData.supplier_data
    ].filter(Boolean);

    const master = masterVariations.find(variation => 
      Array.isArray(variation) && variation.length > 0
    ) || [];

    console.log(`✅ Found ${master.length} master records`);
    return master;
  } catch (error) {
    console.error("❌ Error processing master data:", error);
    return [];
  }
}

// Process product data from /product-details endpoint
function processProductDetails(data: any): any[] {
  try {
    console.log("🔍 Processing product details...");
    
    let products: any[] = [];

    // Handle different response structures
    if (Array.isArray(data)) {
      products = data;
    } else if (data.data && Array.isArray(data.data)) {
      products = data.data;
    } else if (typeof data === 'string') {
      products = JSON.parse(data);
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.products)) {
        products = data.products;
      } else if (Array.isArray(data.product_data)) {
        products = data.product_data;
      }
    }

    console.log(`✅ Found ${products.length} product records`);
    return products;
  } catch (error) {
    console.error("❌ Error processing product details:", error);
    return [];
  }
}

// Transform product data to match database schema
function transformProductData(products: any[]): any[] {
  return products.map(product => {
    // Extract prices from prices array if present
    const prices = product.prices || [];
    const costPrice = prices.find((p: any) => p.price_code === 'CO')?.value || product.cost || '0';
    const mrpPrice = prices.find((p: any) => p.price_code === 'MR')?.value || product.bmrp || product.mrp || '0';
    const retailPrice = prices.find((p: any) => p.price_code === 'S1')?.value || product.salesprice || '0';
    const secondPrice = prices.find((p: any) => p.price_code === 'S2')?.value || product.secondprice || '0';
    const thirdPrice = prices.find((p: any) => p.price_code === 'S3')?.value || product.thirdprice || '0';

    return {
      code: String(product.code || product.productcode || product.item_code || '').trim(),
      name: String(product.name || product.item_name || 'Unknown').trim(),
      barcode: String(product.barcode || product.code || '').trim(),
      quantity: Number(product.quantity || product.stock || 0),
      salesprice: parseFloat(retailPrice),
      bmrp: parseFloat(mrpPrice),
      cost: parseFloat(costPrice),
      secondprice: parseFloat(secondPrice),
      thirdprice: parseFloat(thirdPrice),
      batch_supplier: product.supplier || product.batch_supplier || null,
      category: String(product.category || product.catagory || '').trim(),
      product: String(product.product || product.product_type || '').trim(),
      brand: String(product.brand || product.brand_name || '').trim(),
      unit: String(product.unit || product.unit_type || '').trim(),
      taxcode: String(product.taxcode || product.gst || product.tax || '0').trim(),
      productcode: String(product.productcode || product.product_code || '').trim(),
      expirydate: product.expirydate || product.expiry_date || null,
      prices: product.prices || []
    };
  });
}

// Main download function - Downloads from BOTH endpoints in parallel
export const downloadWithRetry = async (maxRetries = 3) => {
  let lastError = null as any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🚀 ========================================`);
      console.log(`🚀 Download Attempt ${attempt}/${maxRetries}`);
      console.log(`🚀 ========================================\n`);
      
      downloadState.isInProgress = true;
      downloadState.startTime = Date.now();
      downloadState.lastError = null;
      
      // ==============================================
      // STEP 1: DOWNLOAD FROM BOTH ENDPOINTS IN PARALLEL
      // ==============================================
      console.log("📦 STEP 1: Downloading from BOTH endpoints in parallel...\n");
      
      const [dataDownloadResponse, productDetailsResponse] = await Promise.all([
        downloadFromEndpointWithAuth('/data-download').catch(err => {
          console.warn("⚠️ /data-download failed:", err.message);
          return null;
        }),
        downloadFromEndpointWithAuth('/product-details').catch(err => {
          console.warn("⚠️ /product-details failed:", err.message);
          return null;
        })
      ]);
      
      console.log("\n📊 Download Results:");
      console.log(`   /data-download: ${dataDownloadResponse ? '✅ Success' : '❌ Failed'}`);
      console.log(`   /product-details: ${productDetailsResponse ? '✅ Success' : '❌ Failed'}`);
      
      // Check if at least one endpoint succeeded
      if (!dataDownloadResponse && !productDetailsResponse) {
        throw new Error("Both endpoints failed. Check your connection and try again.");
      }
      
      // ==============================================
      // STEP 2: PROCESS MASTER DATA
      // ==============================================
      console.log("\n📦 STEP 2: Processing master data...");
      
      let masterData: any[] = [];
      
      if (dataDownloadResponse) {
        masterData = processMasterData(dataDownloadResponse);
      }
      
      console.log(`✅ Master data: ${masterData.length} records`);
      
      // ==============================================
      // STEP 3: PROCESS PRODUCT DATA & BUILD SUPPLIER MAP
      // ==============================================
      console.log("\n📦 STEP 3: Processing product data and building supplier map...");
      
      // Get products from /data-download (has supplier info)
      let productsFromDataDownload: any[] = [];
      if (dataDownloadResponse) {
        const actualData = dataDownloadResponse.data || dataDownloadResponse.result || dataDownloadResponse;
        const productVariations = [
          actualData.productData,
          actualData.products,
          actualData.product,
          actualData.product_data
        ].filter(Boolean);
        
        productsFromDataDownload = productVariations.find(variation => 
          Array.isArray(variation) && variation.length > 0
        ) || [];
        
        console.log(`📦 Products from /data-download: ${productsFromDataDownload.length}`);
      }
      
      // Build supplier mapping from /data-download products
      const supplierMap = new Map<string, string>();
      for (const product of productsFromDataDownload) {
        const code = String(product.code || product.productcode || '').trim();
        const supplier = product.supplier || product.batch_supplier || null;
        if (code && supplier) {
          supplierMap.set(code, supplier);
        }
      }
      console.log(`📋 Built supplier map with ${supplierMap.size} entries`);
      
      // Get detailed products from /product-details
      let productData: any[] = [];
      
      if (productDetailsResponse) {
        productData = processProductDetails(productDetailsResponse);
        console.log("✅ Using product data from /product-details");
      } else if (productsFromDataDownload.length > 0) {
        productData = productsFromDataDownload;
        console.log("✅ Using product data from /data-download (fallback)");
      }
      
      console.log(`✅ Product data: ${productData.length} records`);
      
      // ==============================================
      // STEP 4: TRANSFORM PRODUCT DATA WITH SUPPLIER MAPPING
      // ==============================================
      console.log("\n📦 STEP 4: Transforming product data with supplier mapping...");
      
      const transformedProducts = productData.map(product => {
        const code = String(product.code || product.productcode || '').trim();
        
        // Extract prices from prices array if present
        const prices = product.prices || [];
        const costPrice = prices.find((p: any) => p.price_code === 'CO')?.value || product.cost || '0';
        const mrpPrice = prices.find((p: any) => p.price_code === 'MR')?.value || product.bmrp || product.mrp || '0';
        const retailPrice = prices.find((p: any) => p.price_code === 'S1')?.value || product.salesprice || '0';
        const secondPrice = prices.find((p: any) => p.price_code === 'S2')?.value || product.secondprice || '0';
        const thirdPrice = prices.find((p: any) => p.price_code === 'S3')?.value || product.thirdprice || '0';

        // Get supplier from map (priority) or from product itself
        const supplier = supplierMap.get(code) || product.supplier || product.batch_supplier || null;

        return {
          code: code,
          name: String(product.name || product.item_name || 'Unknown').trim(),
          barcode: String(product.barcode || product.code || '').trim(),
          quantity: Number(product.quantity || product.stock || 0),
          salesprice: parseFloat(retailPrice),
          bmrp: parseFloat(mrpPrice),
          cost: parseFloat(costPrice),
          secondprice: parseFloat(secondPrice),
          thirdprice: parseFloat(thirdPrice),
          batch_supplier: supplier,
          category: String(product.category || product.catagory || '').trim(),
          product: String(product.product || product.product_type || '').trim(),
          brand: String(product.brand || product.brand_name || '').trim(),
          unit: String(product.unit || product.unit_type || '').trim(),
          taxcode: String(product.taxcode || product.gst || product.tax || '0').trim(),
          productcode: String(product.productcode || product.product_code || '').trim(),
          expirydate: product.expirydate || product.expiry_date || null,
          prices: product.prices || [],
          text1: String(product.text1 || '').trim()

        };
      });
      
      // Count products with suppliers
      const productsWithSuppliers = transformedProducts.filter(p => p.batch_supplier).length;
      console.log(`✅ Transformed ${transformedProducts.length} products`);
      console.log(`📊 Products with suppliers: ${productsWithSuppliers}/${transformedProducts.length}`);
      
      if (transformedProducts.length > 0) {
        console.log("\n📋 Sample products (first 3):");
        transformedProducts.slice(0, 3).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.code} - ${p.name}`);
          console.log(`     Price: ₹${p.salesprice}, MRP: ₹${p.bmrp}, Stock: ${p.quantity}`);
          console.log(`     Supplier: ${p.batch_supplier || 'N/A'}`);
        });
      }
      
      // ==============================================
      // STEP 5: SAVE TO DATABASE
      // ==============================================
      console.log("\n💾 STEP 5: Saving to database...");
      
      if (masterData.length > 0) {
        console.log(`💾 Saving ${masterData.length} master records...`);
        await saveMasterData(masterData);
        console.log("✅ Master data saved");
      } else {
        console.warn("⚠️ No master data to save");
      }
      
      if (transformedProducts.length > 0) {
        console.log(`💾 Saving ${transformedProducts.length} products...`);
        await saveProductData(transformedProducts);
        console.log("✅ Product data saved");
      } else {
        console.warn("⚠️ No product data to save");
      }
      
      // ==============================================
      // STEP 6: VERIFY DATABASE
      // ==============================================
      console.log("\n🔍 STEP 6: Verifying database...");
      const stats = await getLocalDataStats();
      
      console.log("\n📊 Database Status:");
      console.log(`   Master records: ${stats.masterCount}`);
      console.log(`   Product records: ${stats.productCount}`);
      console.log(`   Last synced: ${stats.lastSynced || 'Never'}`);
      
      downloadState.isInProgress = false;
      downloadState.endTime = Date.now();
      
      const result = {
        masterData: masterData,
        productData: transformedProducts,
        totalRecords: masterData.length + transformedProducts.length
      };
      
      console.log(`\n✅ ========================================`);
      console.log(`✅ DOWNLOAD COMPLETED - Attempt ${attempt}`);
      console.log(`✅ Master: ${masterData.length} records`);
      console.log(`✅ Products: ${transformedProducts.length} records`);
      console.log(`✅ Products with suppliers: ${productsWithSuppliers}`);
      console.log(`✅ Total: ${result.totalRecords} records`);
      console.log(`✅ Duration: ${downloadState.endTime - downloadState.startTime}ms`);
      console.log(`✅ ========================================\n`);
      
      return result;
      
    } catch (error: any) {
      console.error(`\n❌ Attempt ${attempt} failed:`, error?.message);
      lastError = error;
      downloadState.lastError = error?.message || 'Unknown error';
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  downloadState.isInProgress = false;
  downloadState.endTime = Date.now();
  throw lastError || new Error("All download attempts failed");
};
// Fast download - memory optimized, frees arrays immediately after save
export const downloadWithRetryFast = async (maxRetries = 3) => {
  let lastError = null as any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`⚡ Fast download attempt ${attempt}/${maxRetries}`);

      downloadState.isInProgress = true;
      downloadState.startTime = Date.now();
      downloadState.lastError = null;

      const data = await downloadFromEndpointWithAuth('/data-download');

      // Process master and product separately, free each after save
      const { saveMasterDataFast, saveProductDataFast } = await import("@/utils/sync");

      let masterCount = 0;
      let productCount = 0;

      // Extract master
      let master = data?.masterData || data?.master || data?.masters || 
                   data?.master_data || data?.suppliers || [];
      if (!Array.isArray(master)) master = [];

      // Save master then free it
      if (master.length > 0) {
        masterCount = master.length;
        await saveMasterDataFast(master);
        master = null; // free immediately
      }

      // Extract product
      let product = data?.productData || data?.products || data?.product || 
                    data?.product_data || data?.items || [];
      if (!Array.isArray(product)) product = [];

      // Save product then free it
      if (product.length > 0) {
        productCount = product.length;
        await saveProductDataFast(product);
        product = null; // free immediately
      }

      downloadState.isInProgress = false;
      downloadState.endTime = Date.now();

      console.log(`⚡ Fast download done: master=${masterCount} product=${productCount}`);

      return { masterCount, productCount, totalRecords: masterCount + productCount };

    } catch (error: any) {
      console.error(`❌ Fast download attempt ${attempt} failed:`, error?.message);
      lastError = error;
      downloadState.lastError = error?.message || 'Unknown error';

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  downloadState.isInProgress = false;
  downloadState.endTime = Date.now();
  throw lastError || new Error("All fast download attempts failed");
};