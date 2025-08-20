import { createEnhancedAPI } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

export default function Settings() {
  const [mode, setMode] = useState<"hardware" | "camera">("hardware");
  const [pinging, setPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<"success" | "failed" | null>(null);

  useEffect(() => {
    const loadSetting = async () => {
      const saved = await SecureStore.getItemAsync("scanMode");
      if (saved === "camera" || saved === "hardware") {
        setMode(saved);
      }
    };
    loadSetting();
  }, []);

  const saveSetting = async (selected: "hardware" | "camera") => {
    await SecureStore.setItemAsync("scanMode", selected);
    setMode(selected);
  };

  const handlePingServer = async () => {
    setPinging(true);
    setPingStatus(null); // Reset status
    try {
      const api = await createEnhancedAPI();
      const startTime = Date.now();
      
      // Test server connectivity by making a simple request
      // We'll try to hit the login endpoint with an OPTIONS request first (if supported)
      // or make a minimal request to see if server responds
      let response;
      
      try {
        // Method 1: Try a basic GET to root path
        console.log("🔍 Testing server connectivity...");
        response = await api.get("/", {
          timeout: 10000,
          validateStatus: function (status) {
            // Accept any response (even 404) as long as server responds
            return status < 500;
          }
        });
        
        console.log(`📡 Server responded with status: ${response.status}`);
        
      } catch (error: any) {
        // Method 2: If GET fails, try making a test POST to login without credentials
        // This will fail authentication but proves server is reachable
        try {
          console.log("🔍 Testing with login endpoint...");
          response = await api.post("/login", {}, {
            timeout: 10000,
            validateStatus: function (status) {
              // Accept 400 (bad request) or 401 (unauthorized) as valid responses
              // These indicate server is working but rejecting our request
              return status === 400 || status === 401 || (status >= 200 && status < 300);
            }
          });
          
          console.log(`📡 Login endpoint responded with status: ${response.status}`);
          
        } catch (loginError: any) {
          // If both methods fail, server is likely unreachable
          throw loginError;
        }
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Consider it successful if server responded (even with 4xx errors)
      if (response && response.status < 500) {
        setPingStatus("success");
        console.log("🎉 Server is reachable!");
        Toast.show({
          type: "success",
          text1: "Server Online",
          text2: `Server is reachable (${responseTime}ms)`,
          visibilityTime: 3000,
        });
      } else {
        throw new Error(`Server error: ${response?.status || 'unknown'}`);
      }
      
    } catch (error: any) {
      setPingStatus("failed");
      console.log("💥 Server ping failed:", error?.message || error);
      let errorMessage = "Server unreachable";
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = "Connection timeout";
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = "Server not found";
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = "Connection refused";
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = "Network error";
      } else if (error.response) {
        if (error.response.status >= 500) {
          errorMessage = `Server error: ${error.response.status}`;
        } else {
          // 4xx errors mean server is reachable but request was invalid
          errorMessage = "Server authentication required";
        }
      } else if (error.request) {
        errorMessage = "No response from server";
      }
      
      Toast.show({
        type: "error",
        text1: "Ping Failed",
        text2: errorMessage,
        visibilityTime: 3000,
      });
    } finally {
      setPinging(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#3B82F6" />
      </TouchableOpacity>

      <View style={styles.content}>
       

        {/* Scan Mode Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scan Mode</Text>
          <Text style={styles.cardSubtitle}>
            Choose your preferred method for scanning barcodes
          </Text>

          <TouchableOpacity
            style={[
              styles.option,
              mode === "hardware" ? styles.optionSelected : styles.optionUnselected
            ]}
            onPress={() => saveSetting("hardware")}
          >
            <View style={styles.optionContent}>
              <Ionicons 
                name="hardware-chip-outline" 
                size={24} 
                color={mode === "hardware" ? "#3B82F6" : "#6B7280"} 
              />
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionTitle,
                  mode === "hardware" ? styles.optionTitleSelected : styles.optionTitleUnselected
                ]}>
                  Zebra Hardware Scanner
                </Text>
                <Text style={styles.optionDescription}>
                  Use built-in barcode scanner
                </Text>
              </View>
              {mode === "hardware" && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              mode === "camera" ? styles.optionSelected : styles.optionUnselected
            ]}
            onPress={() => saveSetting("camera")}
          >
            <View style={styles.optionContent}>
              <Ionicons 
                name="camera-outline" 
                size={24} 
                color={mode === "camera" ? "#3B82F6" : "#6B7280"} 
              />
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionTitle,
                  mode === "camera" ? styles.optionTitleSelected : styles.optionTitleUnselected
                ]}>
                  Camera Scanner
                </Text>
                <Text style={styles.optionDescription}>
                  Use phone's camera to scan
                </Text>
              </View>
              {mode === "camera" && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Server Status */}
        <View style={styles.card}>
          {/* Status Indicator Circle - Enhanced */}
          {(pingStatus || pinging) && (
            <View style={[
              styles.statusIndicator,
              pinging && styles.statusIndicatorLoading,
              pingStatus === "success" && styles.statusIndicatorSuccess,
              pingStatus === "failed" && styles.statusIndicatorFailed
            ]}>
              {pinging ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Ionicons 
                  name={pingStatus === "success" ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={pingStatus === "success" ? "#10B981" : "#EF4444"} 
                />
              )}
            </View>
          )}
          
          <Text style={[styles.cardTitle, { paddingRight: 32 }]}>
            Server Status
          </Text>
          <Text style={styles.cardSubtitle}>
            Check your connection to the server
          </Text>

          <TouchableOpacity
            style={[
              styles.pingButton,
              pinging ? styles.pingButtonDisabled : styles.pingButtonEnabled
            ]}
            onPress={handlePingServer}
            disabled={pinging}
          >
            {pinging ? (
              <>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.pingButtonText}>Pinging Server...</Text>
              </>
            ) : (
              <>
                <Ionicons name="wifi-outline" size={24} color="#3B82F6" />
                <Text style={styles.pingButtonText}>Ping Server</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by IMC Business Solutions
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    padding: 24,
  },
  backButton: {
    position: "absolute",
    top: 48,
    left: 24,
    zIndex: 10,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 30,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#0e42ebff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.30,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: "#EBF8FF",
    borderColor: "#3B82F6",
  },
  optionUnselected: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontWeight: "600",
    fontSize: 16,
  },
  optionTitleSelected: {
    color: "#1D4ED8",
  },
  optionTitleUnselected: {
    color: "#111827",
  },
  optionDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 999,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicatorLoading: {
    backgroundColor: "#EBF8FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  statusIndicatorSuccess: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusIndicatorFailed: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  pingButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pingButtonEnabled: {
    backgroundColor: "#EBF8FF",
    borderColor: "#BFDBFE",
  },
  pingButtonDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },
  pingButtonText: {
    marginLeft: 8,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    
  },
  footerText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});