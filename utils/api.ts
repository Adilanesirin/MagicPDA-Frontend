// utils/api.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Track API instances to prevent reuse issues
const apiInstanceTracker = new Set<string>();

// Enhanced connection test
export async function testConnectionEnhanced(ip: string): Promise<boolean> {
  const cleanIP = ip
    .replace(/^https?:\/\//, "")
    .replace(/:8000$/, "")
    .trim();

  console.log(`Testing connection to: ${cleanIP}:8000`);

  const methods = [
    { name: "Direct HTTP", url: `http://${cleanIP}:8000/status` },
    {
      name: "With User-Agent",
      url: `http://${cleanIP}:8000/status`,
      headers: { "User-Agent": "IMCSync-Mobile/1.0" },
    },
    {
      name: "Basic Fetch",
      url: `http://${cleanIP}:8000/status`,
      method: "fetch",
    },
  ];

  for (const method of methods) {
    try {
      console.log(`Trying ${method.name}...`);

      if (method.method === "fetch") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(method.url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(method.headers ?? {}),
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.status === "online") {
            console.log(`${method.name} successful:`, data);
            return true;
          }
        }
      } else {
        const axiosConfig = {
          timeout: 8000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "IMCSync-Mobile/1.0",
            ...method.headers,
          },
          httpsAgent: false,
          rejectUnauthorized: false,
        };

        const response = await axios.get(method.url, axiosConfig);

        if (response.data && response.data.status === "online") {
            console.log(`${method.name} successful:`, response.data);
            return true;
        }
      }
    } catch (error: any) {
      console.log(`${method.name} failed:`, {
        message: error.message,
        code: error.code,
        name: error.name,
      });
    }
  }

  console.log(`All connection methods failed for ${cleanIP}`);
  return false;
}

// Enhanced API creation with SELECTIVE cache-busting for downloads only
export async function createEnhancedAPI() {
  try {
    const ip = await SecureStore.getItemAsync("paired_ip");
    const token = await SecureStore.getItemAsync("token");

    if (!ip) {
      throw new Error("No paired IP found. Please connect to server first.");
    }

    // Create unique instance ID for tracking
    const instanceId = `api_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const baseURL = `http://${ip}:8000`;

    console.log(`Creating fresh API instance: ${instanceId} for ${baseURL}`);

    // Create completely fresh axios instance
    const instance = axios.create({
      baseURL,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "IMCSync-Mobile/1.0",
        "X-Instance-ID": instanceId,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500,
      adapter: undefined,
    });

    // Enhanced request interceptor with SELECTIVE cache-busting
    instance.interceptors.request.use(
      (config) => {
        console.log(`API Request [${instanceId}]: ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`Base URL: ${config.baseURL}`);

        // Add auth token if available
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // List of endpoints that NEED cache-busting (ONLY for file downloads)
        const needsCacheBusting = [
          '/download-file',
          '/export-excel',
          '/export-csv', 
          '/download-backup',
          '/generate-pdf',
          '/download-report',
          '/export-database',
          '/backup-download',
          '/download',
          '/sync-data',
          '/get-data',
          '/data-download',
          '/api/data'
        ];

        // Check if current URL needs cache-busting
        const needsCacheBypass = needsCacheBusting.some(endpoint => 
          config.url?.includes(endpoint)
        );

        // Only add cache-busting params for download/data endpoints
        if (needsCacheBypass) {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          
          if (!config.params) config.params = {};
          config.params._t = timestamp;
          config.params._r = random;
          config.params._instance = instanceId;

          console.log(`Cache busting params added for download: _t=${timestamp}, _r=${random}, _instance=${instanceId}`);
        } else {
          console.log(`No cache-busting needed for: ${config.url}`);
        }

        return config;
      },
      (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Enhanced response interceptor
    instance.interceptors.response.use(
      (response) => {
        console.log(`API Success [${instanceId}]: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error(`API Error [${instanceId}]:`, {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
        });

        if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
          console.log("Network connectivity issue detected");
        } else if (error.message?.toLowerCase().includes("cleartext")) {
          console.log("HTTP cleartext traffic blocked");
        } else if (error.code === 'ECONNABORTED') {
          console.log("Request timeout");
        } else if (error.response?.status === 422) {
          console.log("Unprocessable Content (422)");
        }

        return Promise.reject(error);
      }
    );

    // Track this instance
    apiInstanceTracker.add(instanceId);

    console.log(`Fresh API instance ready: ${instanceId}`);
    return instance;

  } catch (error) {
    console.error("Error creating enhanced API instance:", error);
    throw new Error(`API initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Special API creator for downloads
export async function createDownloadAPI() {
  try {
    const ip = await SecureStore.getItemAsync("paired_ip");
    const token = await SecureStore.getItemAsync("token");

    if (!ip) {
      throw new Error("No paired IP found");
    }

    const instanceId = `download_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const baseURL = `http://${ip}:8000`;

    console.log(`Creating download API instance: ${instanceId}`);

    const instance = axios.create({
      baseURL,
      timeout: 120000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "IMCSync-Mobile-Download/1.0",
        "X-Instance-ID": instanceId,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

    // Aggressive cache-busting for all download requests
    instance.interceptors.request.use((config) => {
      console.log(`Download Request: ${config.method?.toUpperCase()} ${config.url}`);
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Always add cache-busting for download requests
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      
      if (!config.params) config.params = {};
      config.params._download = timestamp;
      config.params._cache = random;
      config.params._attempt = instanceId;

      return config;
    });

    return instance;
  } catch (error) {
    console.error("Error creating download API:", error);
    throw error;
  }
}

// Network diagnostics
interface NetworkTestResult {
  name: string;
  success: boolean;
  status: number | null;
  error: string | null;
}

export async function runNetworkDiagnostics(ip: string) {
  console.log("Running network diagnostics...");

  const diagnostics = {
    platform: Platform.OS,
    ip: ip,
    timestamp: new Date().toISOString(),
    tests: [] as NetworkTestResult[],
  };

  // Test 1: Basic fetch
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`http://${ip}:8000/status`, {
      signal: controller.signal,
    });

    diagnostics.tests.push({
      name: "Basic Fetch",
      success: response.ok,
      status: response.status,
      error: null,
    });
  } catch (error: any) {
    diagnostics.tests.push({
      name: "Basic Fetch",
      success: false,
      status: null,
      error: error.message,
    });
  }

  // Test 2: Axios with minimal config
  try {
    const response = await axios.get(`http://${ip}:8000/status`, {
      timeout: 5000,
    });

    diagnostics.tests.push({
      name: "Axios Minimal",
      success: true,
      status: response.status,
      error: null,
    });
  } catch (error: any) {
    diagnostics.tests.push({
      name: "Axios Minimal",
      success: false,
      status: error.response?.status || null,
      error: error.message,
    });
  }

  console.log("Network Diagnostics Results:", diagnostics);
  return diagnostics;
}

// Utility functions for managing API instances
export const resetApiState = () => {
  console.log("Resetting API state completely");
  apiInstanceTracker.clear();
};