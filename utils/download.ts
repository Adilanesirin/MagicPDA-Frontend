// Enhanced download functions with better authentication handling

import { createDownloadAPI } from "@/utils/api";
import {
  saveMasterData,
  saveProductData
} from "@/utils/sync";
import * as SecureStore from "expo-secure-store";

// Download state management
let downloadState = {
  isInProgress: false,
  lastError: null,
  startTime: null,
  endTime: null
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
    // Add any cleanup logic here (temp files, cached data, etc.)
    downloadState.lastError = null;
    console.log("✅ Download artifacts cleared");
  } catch (error) {
    console.error("❌ Error clearing download artifacts:", error);
    throw error;
  }
};

// First, let's create a function to check authentication status
export const checkAuthenticationStatus = async () => {
  try {
    console.log("🔐 Checking authentication status...");
    
    // Debug: Check all possible token keys
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
    
    // Try to get all SecureStore keys for debugging
    try {
      const allKeys = await SecureStore.getAllKeysAsync();
      console.log("🔍 All SecureStore Keys:", allKeys);
    } catch (keyError) {
      console.log("🔍 Could not retrieve all keys:", keyError.message);
    }
    
    // Use the first available token - prioritize 'token' since that's what your server returns
    let accessToken = tokenChecks.token || tokenChecks.access_token;
    
    console.log("🔐 Final Auth Status:", {
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

// Enhanced debug function with authentication
export const debugServerResponseWithAuth = async () => {
  try {
    console.log("🧪 Starting authenticated server debug test...");
    
    // Check authentication first
    const { accessToken } = await checkAuthenticationStatus();
    
    // Test with authentication headers
    const response = await fetch(`http://192.168.1.28:8000/data-download?cb=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` // Add auth header
      }
    });
    
    console.log("🌐 Response Status:", response.status);
    console.log("🌐 Response Headers:", Object.fromEntries(response.headers.entries()));
    
    const textResponse = await response.text();
    console.log("📄 Raw Response (first 1000 chars):", textResponse.substring(0, 1000));
    
    if (response.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    }
    
    if (response.status !== 200) {
      throw new Error(`Server error: ${response.status} - ${textResponse}`);
    }
    
    try {
      const jsonResponse = JSON.parse(textResponse);
      console.log("📊 Parsed JSON Keys:", Object.keys(jsonResponse));
      
      // Log detailed structure
      for (const key of Object.keys(jsonResponse)) {
        const value = jsonResponse[key];
        console.log(`📊 ${key}:`, {
          type: typeof value,
          isArray: Array.isArray(value),
          length: Array.isArray(value) ? value.length : 'N/A',
          sample: Array.isArray(value) && value.length > 0 ? value[0] : value
        });
      }
      
      return jsonResponse;
    } catch (parseError) {
      console.error("❌ Failed to parse JSON:", parseError);
      return null;
    }
    
  } catch (error) {
    console.error("❌ Authenticated debug test failed:", error);
    throw error;
  }
};

// Enhanced download function with better auth handling
export async function downloadFromEndpointWithAuth(path) {
  try {
    console.log("🌐 Downloading from endpoint with auth:", path);
    
    // Check authentication first
    await checkAuthenticationStatus();
    
    const api = await createDownloadAPI();
    const url = `${path}?cb=${Date.now()}`;
    
    // Log the request details
    console.log("📤 API Request Details:", {
      url: api.defaults?.baseURL + url,
      headers: api.defaults?.headers,
      hasAuth: !!(api.defaults?.headers?.common?.Authorization || api.defaults?.headers?.Authorization)
    });
    
    const res = await api.get(url, { 
      headers: { "Cache-Control": "no-cache" }, 
      timeout: 120000 
    });
    
    if (!res || !res.data) throw new Error("Empty response from server");
    
    console.log("📥 API Response Details:", {
      status: res.status,
      hasData: !!res.data,
      dataKeys: res.data ? Object.keys(res.data) : 'no data',
      dataPreview: typeof res.data === 'object' ? JSON.stringify(res.data).substring(0, 300) + '...' : res.data
    });
    
    // Check for authentication errors in response
    if (res.status === 401 || (res.data && res.data.detail === "Token missing")) {
      throw new Error("Authentication failed. Please login again.");
    }
    
    return res.data;
  } catch (error) {
    console.error("downloadFromEndpointWithAuth failed:", error?.message ?? error);
    
    // Handle specific auth errors
    if (error?.response?.status === 401 || error?.message?.includes("Token missing")) {
      throw new Error("Authentication failed. Please login again.");
    }
    
    throw error;
  }
}

// Enhanced process function with better data structure handling
export async function processDownloadedDataEnhanced(data) {
  try {
    if (!data) throw new Error("No data to process");

    console.log("🔍 Raw API Response Structure:", {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : 'no data',
      dataType: typeof data,
      isArray: Array.isArray(data)
    });

    // Handle different possible response structures
    let actualData = data;
    
    // If the response is wrapped in a 'data' property
    if (data.data && typeof data.data === 'object') {
      actualData = data.data;
      console.log("🔍 Found nested data property, using that instead");
    }
    
    // If the response has a 'result' property
    if (data.result && typeof data.result === 'object') {
      actualData = data.result;
      console.log("🔍 Found result property, using that instead");
    }

    // Check all possible variations for master data
    const masterVariations = [
      actualData.masterData,
      actualData.master,
      actualData.masters,
      actualData.master_data,
      actualData.suppliers,
      actualData.vendor,
      actualData.vendors
    ].filter(Boolean);

    // Check all possible variations for product data
    const productVariations = [
      actualData.productData,
      actualData.products,
      actualData.product,
      actualData.product_data,
      actualData.items,
      actualData.inventory
    ].filter(Boolean);

    console.log("🔍 Data variations found:", {
      masterVariations: masterVariations.length,
      productVariations: productVariations.length
    });

    // Find the first valid array for master data
    const master = masterVariations.find(variation => 
      Array.isArray(variation) && variation.length > 0
    ) || [];
    
    // Find the first valid array for product data
    const product = productVariations.find(variation => 
      Array.isArray(variation) && variation.length > 0
    ) || [];

    console.log("🔍 Final selected data:", {
      masterCount: master.length,
      productCount: product.length,
      masterSample: master.length > 0 ? JSON.stringify(master[0]).substring(0, 100) + '...' : 'no data',
      productSample: product.length > 0 ? JSON.stringify(product[0]).substring(0, 100) + '...' : 'no data'
    });

    if (master.length === 0 && product.length === 0) {
      console.warn("⚠️ No data found in any expected format. Server might be returning empty dataset or different structure.");
      
      // Log the actual structure to help debug
      console.log("🔍 Complete data structure for debugging:", JSON.stringify(actualData, null, 2));
    }

    if (master.length > 0) {
      console.log("💾 Saving master data...");
      await saveMasterData(master);
    }
    
    if (product.length > 0) {
      console.log("💾 Saving product data...");
      await saveProductData(product);
    }

    const total = master.length + product.length;
    return { masterData: master, productData: product, totalRecords: total };
  } catch (error) {
    console.error("processDownloadedDataEnhanced error:", error?.message ?? error);
    throw error;
  }
}

// Main download function with retry logic
export const downloadWithRetry = async (maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 Download attempt ${attempt}/${maxRetries}`);
      
      // Set download in progress
      downloadState.isInProgress = true;
      downloadState.startTime = Date.now();
      downloadState.lastError = null;
      
      // Perform the actual download
      const data = await downloadFromEndpointWithAuth('/data-download');
      const result = await processDownloadedDataEnhanced(data);
      
      // Mark as completed
      downloadState.isInProgress = false;
      downloadState.endTime = Date.now();
      
      console.log(`✅ Download completed successfully on attempt ${attempt}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Download attempt ${attempt} failed:`, error.message);
      
      lastError = error;
      downloadState.lastError = error.message;
      downloadState.isInProgress = false;
      downloadState.endTime = Date.now();
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};