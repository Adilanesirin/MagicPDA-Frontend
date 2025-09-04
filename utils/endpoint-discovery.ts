// utils/endpoint-discovery.ts
import { createEnhancedAPI } from "./api";

export interface ServerEndpoint {
  url: string;
  method: string;
  description: string;
}

export async function discoverDownloadEndpoints(): Promise<ServerEndpoint[]> {
  try {
    const api = await createEnhancedAPI();
    
    // Common download endpoint patterns based on typical server setups
    const commonEndpoints = [
      // Single endpoint patterns (returns all data)
      { url: '/api/data', method: 'GET', description: 'Complete data download' },
      { url: '/data-download', method: 'GET', description: 'Data download endpoint' },
      { url: '/sync/data', method: 'GET', description: 'Sync all data' },
      { url: '/download/all', method: 'GET', description: 'Download all data' },
      { url: '/api/sync', method: 'GET', description: 'API sync endpoint' },
      
      // Separate endpoints pattern
      { url: '/api/master-data', method: 'GET', description: 'Master data only' },
      { url: '/api/product-data', method: 'GET', description: 'Product data only' },
      { url: '/api/inventory-data', method: 'GET', description: 'Inventory data only' },
      { url: '/master-data', method: 'GET', description: 'Master data endpoint' },
      { url: '/product-data', method: 'GET', description: 'Product data endpoint' },
      { url: '/inventory-data', method: 'GET', description: 'Inventory data endpoint' },
      { url: '/download/master', method: 'GET', description: 'Download master data' },
      { url: '/download/products', method: 'GET', description: 'Download products' },
      { url: '/download/inventory', method: 'GET', description: 'Download inventory' },
      
      // Alternative patterns
      { url: '/export/data', method: 'GET', description: 'Export data' },
      { url: '/get/master', method: 'GET', description: 'Get master data' },
      { url: '/get/products', method: 'GET', description: 'Get products' },
      { url: '/get/inventory', method: 'GET', description: 'Get inventory' },
    ];

    return commonEndpoints;
  } catch (error) {
    console.error("Error discovering endpoints:", error);
    return [];
  }
}

export async function testEndpoint(endpoint: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const api = await createEnhancedAPI();
    const response = await api.get(endpoint, { timeout: 15000 });
    
    // Check if response looks like valid data
    const isDataResponse = 
      (Array.isArray(response.data) && response.data.length > 0) ||
      (typeof response.data === 'object' && response.data !== null && 
       (response.data.master_data || response.data.product_data || response.data.data));
    
    if (response.status === 200 && isDataResponse) {
      return { success: true, data: response.data };
    }
    
    return { success: false, error: 'Invalid response format' };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.response?.status === 404 ? 'Endpoint not found' : error.message 
    };
  }
}

export async function findWorkingEndpoints() {
  const endpoints = await discoverDownloadEndpoints();
  const results: { [key: string]: { url: string; data: any } } = {};
  
  console.log('🔍 Testing potential download endpoints...');
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.url}`);
    const result = await testEndpoint(endpoint.url);
    
    if (result.success) {
      console.log(`✅ Found working endpoint: ${endpoint.url}`);
      
      // Determine what type of data this endpoint provides
      if (endpoint.description.includes('master') || 
          (result.data && Array.isArray(result.data) && result.data[0]?.code)) {
        results.master = { url: endpoint.url, data: result.data };
      } else if (endpoint.description.includes('product') || 
                 (result.data && Array.isArray(result.data) && result.data[0]?.barcode)) {
        results.products = { url: endpoint.url, data: result.data };
      } else if (endpoint.description.includes('inventory')) {
        results.inventory = { url: endpoint.url, data: result.data };
      } else if (result.data.master_data || result.data.product_data) {
        // Combined endpoint with all data
        results.combined = { url: endpoint.url, data: result.data };
      }
      
      break; // Stop after finding first working endpoint
    } else {
      console.log(`❌ ${endpoint.url}: ${result.error}`);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

export async function getServerInfo() {
  try {
    const api = await createEnhancedAPI();
    const response = await api.get('/status');
    
    if (response.data && response.data.status === 'online') {
      return {
        online: true,
        serverInfo: response.data,
        endpoints: response.data.available_endpoints || []
      };
    }
  } catch (error) {
    console.error('Error getting server info:', error);
  }
  
  return { online: false, serverInfo: null, endpoints: [] };
}