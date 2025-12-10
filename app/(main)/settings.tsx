import { createEnhancedAPI } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

export default function Settings() {
  const [mode, setMode] = useState<"hardware" | "camera">("hardware");
  const [pinging, setPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<"success" | "failed" | null>(null);
  const [removingLicense, setRemovingLicense] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<{
    customerName: string;
    licenseKey: string;
    deviceId: string;
  } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      // Load scan mode
      const saved = await SecureStore.getItemAsync("scanMode");
      if (saved === "camera" || saved === "hardware") {
        setMode(saved);
      }

      // Load license info
      const customerName = await AsyncStorage.getItem("customerName");
      const licenseKey = await AsyncStorage.getItem("licenseKey");
      const deviceId = await AsyncStorage.getItem("deviceId");

      if (customerName && licenseKey && deviceId) {
        setLicenseInfo({ customerName, licenseKey, deviceId });
      }
    };
    loadSettings();
  }, []);

  const saveSetting = async (selected: "hardware" | "camera") => {
    await SecureStore.setItemAsync("scanMode", selected);
    setMode(selected);
  };

  const handlePingServer = async () => {
    setPinging(true);
    setPingStatus(null);
    try {
      const api = await createEnhancedAPI();
      const startTime = Date.now();
      
      let response;
      
      try {
        console.log("🔍 Testing server connectivity...");
        response = await api.get("/", {
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500;
          }
        });
        
        console.log(`📡 Server responded with status: ${response.status}`);
        
      } catch (error: any) {
        try {
          console.log("🔍 Testing with login endpoint...");
          response = await api.post("/login", {}, {
            timeout: 10000,
            validateStatus: function (status) {
              return status === 400 || status === 401 || (status >= 200 && status < 300);
            }
          });
          
          console.log(`📡 Login endpoint responded with status: ${response.status}`);
          
        } catch (loginError: any) {
          throw loginError;
        }
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
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

  const handleRemoveLicense = () => {
    if (!licenseInfo) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No license information found",
      });
      return;
    }

    Alert.alert(
      "Remove License",
      `Are you sure you want to deactivate this device from license?\n\nCustomer: ${licenseInfo.customerName}\n\nThis will log you out and you'll need to activate again.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: confirmRemoveLicense
        }
      ]
    );
  };

  const confirmRemoveLicense = async () => {
    if (!licenseInfo) return;

    setRemovingLicense(true);

    try {
      console.log("🗑️ Removing license...");
      console.log("License Key:", licenseInfo.licenseKey);
      console.log("Device ID:", licenseInfo.deviceId);

      const LOGOUT_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/logout/`;

      const response = await fetch(LOGOUT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          license_key: licenseInfo.licenseKey,
          device_id: licenseInfo.deviceId,
        }),
      });

      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        Toast.show({
          type: "error",
          text1: "Server Error",
          text2: "Invalid response from server",
        });
        setRemovingLicense(false);
        return;
      }

      console.log("Logout response:", data);

      if (response.ok && data.success) {
        console.log("✅ License removed successfully");

        // Clear all stored data
        await AsyncStorage.multiRemove([
          "licenseActivated",
          "licenseKey",
          "deviceId",
          "customerName",
          "projectName",
          "clientId",
        ]);

        // Also clear auth tokens
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("userId");

        Toast.show({
          type: "success",
          text1: "License Removed",
          text2: "Device has been deactivated successfully",
        });

        // Redirect to license activation screen after a short delay
        setTimeout(() => {
          router.replace("/(auth)/license");
        }, 1500);
      } else {
        const errorMessage =
          data.message ||
          data.error ||
          data.detail ||
          "Failed to remove license";

        console.error("License removal failed:", errorMessage);

        Toast.show({
          type: "error",
          text1: "Removal Failed",
          text2: errorMessage,
        });
      }
    } catch (error: any) {
      console.error("💥 License removal error:", error);

      let errorMessage = "Network error. Please check your connection.";

      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      if (
        error.name === "TypeError" &&
        error.message.includes("Network request failed")
      ) {
        errorMessage = "Cannot connect to server. Check your internet connection.";
      }

      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: errorMessage,
      });
    } finally {
      setRemovingLicense(false);
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

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* License Management */}
        {licenseInfo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>License Management</Text>
            <Text style={styles.cardSubtitle}>
              Manage your device license activation
            </Text>

            {/* License Info Display */}
            <View style={styles.licenseInfoBox}>
              <View style={styles.licenseInfoRow}>
                <Ionicons name="person-outline" size={18} color="#6B7280" />
                <Text style={styles.licenseInfoLabel}>Customer:</Text>
                <Text style={styles.licenseInfoValue}>{licenseInfo.customerName}</Text>
              </View>
              <View style={styles.licenseInfoRow}>
                <Ionicons name="key-outline" size={18} color="#6B7280" />
                <Text style={styles.licenseInfoLabel}>License:</Text>
                <Text style={styles.licenseInfoValue} numberOfLines={1}>
                  {licenseInfo.licenseKey}
                </Text>
              </View>
              <View style={styles.licenseInfoRow}>
                <Ionicons name="phone-portrait-outline" size={18} color="#6B7280" />
                <Text style={styles.licenseInfoLabel}>Device:</Text>
                <Text style={styles.licenseInfoValue} numberOfLines={1}>
                  {licenseInfo.deviceId.substring(0, 20)}...
                </Text>
              </View>
            </View>

            {/* Remove License Button */}
            <TouchableOpacity
              style={[
                styles.removeButton,
                removingLicense && styles.removeButtonDisabled
              ]}
              onPress={handleRemoveLicense}
              disabled={removingLicense}
            >
              {removingLicense ? (
                <>
                  <ActivityIndicator size="small" color="#DC2626" />
                  <Text style={styles.removeButtonText}>Removing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  <Text style={styles.removeButtonText}>Remove License</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.warningText}>
              ⚠️ Removing license will deactivate this device and log you out
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by IMC Business Solutions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
    gap: 30,
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
  licenseInfoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  licenseInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  licenseInfoLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    minWidth: 70,
  },
  licenseInfoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    flex: 1,
  },
  removeButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  removeButtonDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  removeButtonText: {
    marginLeft: 8,
    fontWeight: "600",
    color: "#DC2626",
    fontSize: 16,
  },
  warningText: {
    fontSize: 12,
    color: "#F59E0B",
    textAlign: "center",
    fontStyle: "italic",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});