// utils/enhanced-api.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Enhanced connection test with multiple fallback methods
export async function testConnectionEnhanced(ip: string): Promise<boolean> {
  const cleanIP = ip
    .replace(/^https?:\/\//, "")
    .replace(/:8000$/, "")
    .trim();

  console.log(`🔍 Enhanced connection test to: ${cleanIP}:8000`);

  // Multiple connection methods to try
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
      console.log(`🧪 Trying ${method.name}...`);

      if (method.method === "fetch") {
        // Use native fetch as fallback
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
            console.log(`✅ ${method.name} successful:`, data);
            return true;
          }
        }
      } else {
        // Use axios
        const axiosConfig = {
          timeout: 8000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "IMCSync-Mobile/1.0",
            ...method.headers,
          },
          // Important: Force HTTP even in production
          httpsAgent: false,
          // Disable SSL verification for local networks
          rejectUnauthorized: false,
        };

        const response = await axios.get(method.url, axiosConfig);

        if (response.data && response.data.status === "online") {
          console.log(`✅ ${method.name} successful:`, response.data);
          return true;
        }
      }
    } catch (error: any) {
      console.log(`❌ ${method.name} failed:`, {
        message: error.message,
        code: error.code,
        name: error.name,
      });

      // Log specific error types for debugging
      if (error.code === "NETWORK_ERROR") {
        console.log("   🔍 Network error - likely blocked by security policy");
      } else if (error.name === "AbortError") {
        console.log("   ⏱️ Request timed out");
      } else if (error.message?.includes("cleartext")) {
        console.log(
          "   🚫 Cleartext HTTP blocked - check network security config"
        );
      }
    }
  }

  console.log(`❌ All connection methods failed for ${cleanIP}`);
  return false;
}

// Enhanced API instance with multiple fallback strategies
export async function createEnhancedAPI() {
  try {
    const ip = await SecureStore.getItemAsync("paired_ip");
    const token = await SecureStore.getItemAsync("token");

    if (!ip) {
      throw new Error("No paired IP found. Please connect to server first.");
    }

    console.log("🌐 Creating enhanced API instance for IP:", ip);

    const baseURL = `http://${ip}:8000`;

    const instance = axios.create({
      baseURL,
      timeout: 45000, // Longer timeout for production
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "IMCSync-Mobile/1.0",
        // Add cache control to prevent caching issues
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      // Production-specific settings
      maxRedirects: 0,
      validateStatus: (status) => status < 500, // Accept 4xx errors for handling
    });

    // Enhanced request interceptor
    instance.interceptors.request.use(
      (config) => {
        console.log(
          `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        console.log(`📡 Base URL: ${config.baseURL}`);

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add timestamp to prevent caching
        if (config.url && !config.url.includes("?")) {
          config.url += `?_t=${Date.now()}`;
        }

        return config;
      },
      (error) => {
        console.error("❌ Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Enhanced response interceptor
    instance.interceptors.response.use(
      (response) => {
        console.log(
          `✅ API Success: ${response.status} ${response.config.url}`
        );
        return response;
      },
      async (error) => {
        console.error("❌ API Error Details:", {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
        });

        // Specific error handling for network issues
        if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
          console.log("🔍 Network connectivity issue detected");
          console.log("   - Check if server is running");
          console.log("   - Verify firewall settings");
          console.log("   - Ensure both devices on same WiFi");
        }

        if (error.message?.toLowerCase().includes("cleartext")) {
          console.log("🚫 HTTP cleartext traffic blocked");
          console.log("   - Check network_security_config.xml");
          console.log("   - Verify usesCleartextTraffic is true");
        }

        return Promise.reject(error);
      }
    );

    return instance;
  } catch (error) {
    console.error("❌ Error creating enhanced API instance:", error);
    throw error;
  }
}

interface NetworkTestResult {
  name: string;
  success: boolean;
  status: number | null;
  error: string | null;
}

// Network diagnostics function
export async function runNetworkDiagnostics(ip: string) {
  console.log("🔍 Running network diagnostics...");

  const diagnostics: {
    platform: string;
    ip: string;
    timestamp: string;
    tests: NetworkTestResult[];
  } = {
    platform: Platform.OS,
    ip: ip,
    timestamp: new Date().toISOString(),
    tests: [],
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

  console.log("📊 Network Diagnostics Results:", diagnostics);
  return diagnostics;
}
