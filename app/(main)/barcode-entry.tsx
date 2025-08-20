import { saveOrderToSync } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const db = SQLite.openDatabaseSync("magicpedia.db");

export default function BarcodeEntry() {
  const { supplier, supplier_code } = useLocalSearchParams<{
    supplier: string;
    supplier_code: string;
  }>();
  const router = useRouter();

  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [hardwareScanValue, setHardwareScanValue] = useState("");
  const [scanning, setScanning] = useState(true);
  const [scanMode, setScanMode] = useState<"camera" | "hardware">("hardware");
  const [isEditing, setIsEditing] = useState(false);
  const [scanModeLoaded, setScanModeLoaded] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (hasPermission === null) {
      requestPermission();
    }
  }, [hasPermission]);

  useEffect(() => {
    const loadScanMode = async () => {
      const savedMode = await SecureStore.getItemAsync("scanMode");
      if (savedMode === "hardware" || savedMode === "camera") {
        setScanMode(savedMode);
      }
      setScanModeLoaded(true);
    };
    loadScanMode();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (scanMode === "hardware" && !isEditing) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [scanMode, isEditing]);

  // Handle Zebra input
  useEffect(() => {
    if (hardwareScanValue.length > 0) {
      handleBarCodeScanned({ data: hardwareScanValue.trim() });
      setHardwareScanValue("");
    }
  }, [hardwareScanValue]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);

    try {
      const rows = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode = ?",
        [data]
      );

      if (rows.length === 0) {
        Alert.alert("Product not found", `Barcode: ${data}`);
        setScanning(true);
        return;
      }

      const existing = scannedItems.find((item) => item.barcode === data);
      if (existing) {
        Alert.alert("Info", `Product already scanned: ${existing.name}`);
        return;
      }

      const product = rows[0] as { [key: string]: any; quantity?: number };
      if (typeof product === "object" && product !== null) {
        const newItem = {
          ...product,
          quantity: product.quantity ?? 1,
          cost: product.cost ?? product.bmrp ?? 0, // Make cost editable, default to existing cost or MRP
          currentStock: product.quantity ?? 0, // Current stock from database
          batchSupplier: product.batch_supplier ?? supplier, // Use batch supplier or current supplier
          scannedAt: new Date().getTime(), // Add timestamp
        };
        setScannedItems((prev) => [newItem, ...prev]); // Add to beginning of array
      } else {
        Alert.alert("Error", "Scanned data is invalid.");
      }
    } catch (err) {
      console.error("❌ Error fetching product:", err);
      Alert.alert("Error", "Failed to scan product.");
    } finally {
      setTimeout(() => setScanning(true), 800);
    }
  };

  const handleManualSearch = async () => {
    const trimmed = manualBarcode.trim();
    if (!trimmed) return;

    try {
      const rows = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode = ?",
        [trimmed]
      );

      if (rows.length === 0) {
        Alert.alert("Product not found", `Barcode: ${trimmed}`);
        return;
      }

      const existing = scannedItems.find((item) => item.barcode === trimmed);
      if (existing) {
        Alert.alert("Info", `Product already scanned: ${existing.name}`);
        return;
      }

      const product = rows[0] as { [key: string]: any; quantity?: number };
      const newItem = {
        ...product,
        quantity: product.quantity ?? 1,
        cost: product.cost ?? product.bmrp ?? 0, // Make cost editable
        currentStock: product.quantity ?? 0, // Current stock from database
        batchSupplier: product.batch_supplier ?? supplier, // Use batch supplier or current supplier
        scannedAt: new Date().getTime(), // Add timestamp
      };

      setScannedItems((prev) => [newItem, ...prev]); // Add to beginning of array
      setManualBarcode(""); // clear after search
    } catch (err) {
      console.error("❌ Error fetching product:", err);
      Alert.alert("Error", "Failed to fetch product.");
    }
  };

  const updateQuantities = async () => {
    try {
      const userId = await SecureStore.getItemAsync("user_id");
      const today = new Date().toISOString().split("T")[0];

      await db.withTransactionAsync(async () => {
        for (const item of scannedItems) {
          // Save entry to sync table
          await saveOrderToSync({
            supplier_code: supplier_code,
            userid: userId ?? "unknown",
            barcode: item.barcode,
            quantity: item.quantity,
            rate: item.cost ?? 0, // Use the editable cost
            mrp: item.bmrp ?? 0,
            order_date: today,
          });

          await db.runAsync(
            "UPDATE product_data SET quantity = ?, cost = ? WHERE barcode = ?",
            [item.quantity, item.cost, item.barcode]
          );
        }
      });

      Alert.alert("✅ Success", "Entries saved for sync!");
      setScannedItems([]);
      router.push("/"); // Navigate to index page instead of router.back()
    } catch (err) {
      console.error("❌ Save failed:", err);
      Alert.alert("Error", "Failed to save entries.");
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (hasPermission?.status !== "granted" && scanMode === "camera") {
    Alert.alert(
      "Permission Required",
      "Camera access is needed to scan barcodes.",
      [
        { text: "OK", onPress: () => requestPermission() },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }
  if (!scanModeLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Loading scan mode...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* Back Button */}
      <View className="absolute top-12 left-4 z-50">
        <TouchableOpacity
          onPress={handleBack}
       
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 bg-gray-100"
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 60 }}
      >
        <View className="p-4">
          {/* Hidden Zebra Scanner Input */}
          {scanMode === "hardware" && (
            <TextInput
              ref={inputRef}
              autoFocus
              value={hardwareScanValue}
              onChangeText={(text) => setHardwareScanValue(text)}
              style={{ height: 1, width: 1, opacity: 0, position: "absolute" }}
              showSoftInputOnFocus={false}
              blurOnSubmit={false}
            />
          )}

          <Text className="text-2xl font-bold text-blue-500 mb-4">
            Supplier: {supplier} ({supplier_code})
          </Text>

          {/* Camera Scanner */}
          {scanMode === "camera" && (
            <View className="rounded-2xl overflow-hidden h-64 mb-4 bg-gray-200 border border-gray-300 shadow-sm">
              {scanning ? (
                <CameraView
                  style={{ flex: 1 }}
                  onBarcodeScanned={handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "code128", "code39", "qr"],
                  }}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-gray-400">Paused</Text>
                </View>
              )}
            </View>
          )}
          <View className="flex-row items-center mb-4 gap-2">
            <TextInput
              placeholder="Enter barcode manually"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              className="flex-1 border border-gray-300 px-4 py-2 rounded-xl bg-white shadow-sm"
              keyboardType="default"
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
            />
            <TouchableOpacity
              onPress={handleManualSearch}
              className="bg-blue-500 px-4 py-2 rounded-xl"
            >
              <Text className="text-white font-semibold">Get</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-lg font-semibold mb-2 text-gray-700">
            Scanned Products
          </Text>

          {scannedItems.length === 0 && (
            <Text className="text-center text-gray-400 italic mt-4">
              No products scanned
            </Text>
          )}

          {scannedItems.map((item, index) => (
            <View
              key={item.barcode}
              style={{
                marginBottom: 16,
                backgroundColor: 'white',
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
                borderWidth: 1,
                borderColor: '#f3f4f6',
              }}
            >
              {/* Header Section */}
              <View style={{
                backgroundColor: '#eff6ff',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}>
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text style={{
                      fontWeight: 'bold',
                      fontSize: 18,
                      color: '#111827',
                      marginBottom: 8,
                      lineHeight: 22,
                    }}>
                      {item.name}
                    </Text>
                    <View className="flex-row items-center">
                      <View style={{
                        backgroundColor: '#e5e7eb',
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '500',
                          color: '#374151',
                        }}>
                          {item.barcode}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = scannedItems.filter((_, i) => i !== index);
                      setScannedItems(updated);
                    }}
                    style={{
                      backgroundColor: '#fef2f2',
                      borderRadius: 20,
                      padding: 8,
                      marginLeft: 12,
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Product Details Section */}
              <View style={{ padding: 16 }}>
                {/* Price and Stock Row */}
                <View className="flex-row mb-4">
                  <View className="flex-1" style={{ marginRight: 8 }}>
                    <View style={{
                      backgroundColor: '#f0fdf4',
                      borderRadius: 12,
                      padding: 12,
                      
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: '#15803d',
                        marginBottom: 4,
                      }}>MRP</Text>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#166534',
                      }}>
                        ₹{item.bmrp || 0}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1" style={{ marginLeft: 8 }}>
                    <View style={{
                      backgroundColor: '#eff6ff',
                      borderRadius: 12,
                      padding: 12,
                      
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: '#1d4ed8',
                        marginBottom: 4,
                      }}>Current Stock</Text>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#1e40af',
                      }}>
                        {item.currentStock}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Cost and Supplier Row */}
                <View className="flex-row mb-4">
                  <View className="flex-1" style={{ marginRight: 8 }}>
                    <View style={{
                      backgroundColor: '#fff7ed',
                      borderRadius: 12,
                      padding: 12,
                      
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: '#c2410c',
                        marginBottom: 8,
                      }}>Cost (Editable)</Text>
                      <TextInput
                        keyboardType="numeric"
                        style={{
                          backgroundColor: 'white',
                          borderWidth: 2,
                          borderColor: '#fed7aa',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: '#c2410c',
                          textAlign: 'center',
                        }}
                        value={item.cost?.toString() || "0"}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                        onChangeText={(val) => {
                          const updated = [...scannedItems];
                          updated[index].cost = parseFloat(val) || 0;
                          setScannedItems(updated);
                        }}
                      />
                    </View>
                  </View>
                  <View className="flex-1" style={{ marginLeft: 8 }}>
                    <View style={{
                      backgroundColor: '#faf5ff',
                      borderRadius: 12,
                      padding: 12,
                      
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: '#7c2d12',
                        marginBottom: 4,
                      }}>Batch Supplier</Text>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#7c2d12',
                        lineHeight: 16,
                      }}>
                        {item.batchSupplier || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quantity Control Section */}
                <View style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 12,
                    textAlign: 'center',
                  }}>
                    Quantity Management
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                      onPress={() => {
                        const updated = [...scannedItems];
                        updated[index].quantity = Math.max(
                          0,
                          updated[index].quantity - 1
                        );
                        setScannedItems(updated);
                      }}
                      style={{
                        
                        padding: 12,
                        shadowColor: '#ef4444',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <Ionicons name="remove" size={24} color="black" />
                    </TouchableOpacity>

                    <View style={{ marginHorizontal: 16, flex: 1 }}>
                      <TextInput
                        keyboardType="numeric"
                        style={{
                          backgroundColor: 'white',
                          borderWidth: 2,
                          borderColor: '#a5b4fc',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 12,
                          textAlign: 'center',
                          fontSize: 20,
                          fontWeight: 'bold',
                          color: '#3730a3',
                          shadowColor: '#6366f1',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        value={item.quantity.toString()}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                        onChangeText={(val) => {
                          const updated = [...scannedItems];
                          updated[index].quantity = parseInt(val) || 0;
                          setScannedItems(updated);
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        const updated = [...scannedItems];
                        updated[index].quantity += 1;
                        setScannedItems(updated);
                      }}
                      style={{
                       
                        padding: 12,
                        shadowColor: '#22c55e',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <Ionicons name="add" size={24} color="black" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Summary Footer */}
                <View style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#e5e7eb',
                }}>
                  <View className="flex-row justify-between items-center">
                    <Text style={{
                      fontSize: 14,
                      color: '#4b5563',
                    }}>Total Value:</Text>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#4f46e5',
                    }}>
                      ₹{((item.cost || 0) * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            className={`mt-6 rounded-xl p-4 shadow-lg ${
              scannedItems.length > 0 ? "bg-orange-400" : "bg-gray-300"
            }`}
            disabled={scannedItems.length === 0}
            onPress={updateQuantities}
          >
            <Text className="text-white text-center text-lg font-bold">
              Update Quantities
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View className="mt-10 mb-6">
            <Text className="text-sm text-gray-400 text-center">
              Powered by IMC Business Solutions
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}