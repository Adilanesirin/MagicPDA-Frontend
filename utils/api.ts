// utils/api.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Function to get local network IP ranges to try
function getLocalIPRanges(): string[] {
  // Common local network patterns
  const ranges = [];

  // 192.168.x.x networks (most common home WiFi)
  for (let i = 1; i <= 255; i++) {
    ranges.push(`192.168.1.${i}`);
    ranges.push(`192.168.0.${i}`);
  }

  // Add more ranges if needed
  // ranges.push(...get10xRanges()); // Uncomment if you need 10.x.x.x ranges

  return ranges;
}

// Function to scan for the server on local network
export async function scanForServer(
  onProgress?: (current: number, total: number, currentIP: string) => void
): Promise<string | null> {
  console.log("🔍 Scanning local network for server...");

  // First check if we have a saved IP that still works
  const savedIP = await SecureStore.getItemAsync("paired_ip");
  if (savedIP) {
    console.log("🔄 Testing saved IP:", savedIP);
    if (await testConnection(savedIP)) {
      console.log("✅ Saved IP still works:", savedIP);
      return savedIP;
    }
    console.log("❌ Saved IP no longer works, scanning...");
  }

  // Get common IP ranges to test
  const ipsToTest = getLocalIPRanges();

  // Test IPs in parallel (but limited to avoid overwhelming the network)
  const batchSize = 10;
  let found: string | null = null;

  for (let i = 0; i < ipsToTest.length && !found; i += batchSize) {
    const batch = ipsToTest.slice(i, i + batchSize);

    const promises = batch.map(async (ip) => {
      try {
        onProgress?.(i + batch.indexOf(ip), ipsToTest.length, ip);

        // Quick timeout for scanning
        const testInstance = axios.create({
          baseURL: `http://${ip}:8000`,
          timeout: 2000, // Short timeout for scanning
        });

        const response = await testInstance.get("/status");
        if (response.data && response.data.status === "online") {
          console.log("🎯 Found server at:", ip);
          return ip;
        }
      } catch (error) {
        // Silently ignore errors during scanning
      }
      return null;
    });

    const results = await Promise.all(promises);
    found = results.find((result) => result !== null) ?? null;
  }

  if (found) {
    await SecureStore.setItemAsync("paired_ip", found);
    console.log("✅ Server found and saved:", found);
  } else {
    console.log("❌ No server found on local network");
  }

  return found;
}

// Enhanced connection test
export async function testConnection(ip: string): Promise<boolean> {
  try {
    console.log("🔍 Testing connection to:", ip);
    const testInstance = axios.create({
      baseURL: `http://${ip}:8000`,
      timeout: 5000,
    });

    const response = await testInstance.get("/status");
    console.log("✅ Connection test successful:", response.data);

    // Also log available IPs from server response
    if (response.data.all_available_ips) {
      console.log(
        "📡 Server reports these IPs:",
        response.data.all_available_ips
      );
    }

    return response.data && response.data.status === "online";
  } catch (error: any) {
    console.error("❌ Connection test failed:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });
    return false;
  }
}

// Function to dynamically create an axios instance
export async function createAPI() {
  const ip = await SecureStore.getItemAsync("paired_ip");
  const token = await SecureStore.getItemAsync("token");

  if (!ip) {
    throw new Error("No paired IP found. Please pair with server first.");
  }

  // Add logging for debugging
  console.log("🌐 Creating API instance for IP:", ip);
  console.log("📱 Platform:", Platform.OS);

  const baseURL = `http://${ip}:8000`;
  console.log("📡 Base URL:", baseURL);

  const instance = axios.create({
    baseURL,
    timeout: 30000, // Longer timeout for actual requests
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Add request interceptor
  instance.interceptors.request.use(
    (config) => {
      console.log(
        `🚀 Request to: ${config.method?.toUpperCase()} ${config.url}`
      );
      console.log("📤 Request headers:", config.headers);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      console.error("❌ Request interceptor error:", error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor with better error handling
  instance.interceptors.response.use(
    (response) => {
      console.log(`✅ Response from ${response.config.url}:`, response.status);
      return response;
    },
    async (error) => {
      console.error("❌ Response error:", {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });

      // If network error, try to find server again
      if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
        console.log(
          "🔄 Network error detected, might need to re-scan for server"
        );
        // You could trigger a re-scan here if needed
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

// Manual IP entry function
export async function connectToManualIP(ip: string): Promise<boolean> {
  console.log("🔧 Manual IP connection attempt:", ip);

  // Clean the IP (remove protocol if user added it)
  const cleanIP = ip
    .replace(/^https?:\/\//, "")
    .replace(":8000", "")
    .trim();

  if (await testConnection(cleanIP)) {
    await SecureStore.setItemAsync("paired_ip", cleanIP);
    return true;
  }
  return false;
}
