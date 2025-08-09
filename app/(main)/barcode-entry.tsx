import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import { saveOrderToSync } from "@/utils/sync";

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
        };
        setScannedItems((prev) => [...prev, newItem]);
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
      };

      setScannedItems((prev) => [...prev, newItem]);
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
            rate: item.cost ?? 0,
            mrp: item.bmrp ?? 0,
            order_date: today,
          });

          await db.runAsync(
            "UPDATE product_data SET quantity = ? WHERE barcode = ?",
            [item.quantity, item.barcode]
          );
        }
      });

      Alert.alert("✅ Success", "Entries saved for sync!");
      setScannedItems([]);
      router.back();
    } catch (err) {
      console.error("❌ Save failed:", err);
      Alert.alert("Error", "Failed to save entries.");
    }
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
      <ScrollView
        className="flex-1 bg-gray-100"
        contentContainerStyle={{ paddingBottom: 80 }}
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
              <Text className="text-white font-semibold">Search</Text>
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
              className="mb-4 bg-white rounded-xl p-4 shadow-md border border-gray-200"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-semibold text-base flex-1">
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const updated = scannedItems.filter((_, i) => i !== index);
                    setScannedItems(updated);
                  }}
                >
                  <Text className="text-red-500 font-bold text-lg">✖</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-gray-500 mb-3">
                Barcode: {item.barcode}
              </Text>

              <View className="flex-row justify-between items-center">
                <TextInput
                  keyboardType="numeric"
                  className="border border-yellow-300 bg-white shadow-sm px-4 py-2 rounded-xl text-center text-base w-24"
                  value={item.quantity.toString()}
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                  onChangeText={(val) => {
                    const updated = [...scannedItems];
                    updated[index].quantity = parseInt(val) || 0;
                    setScannedItems(updated);
                  }}
                />

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="bg-gray-300 rounded-xl px-4 py-2"
                    onPress={() => {
                      const updated = [...scannedItems];
                      updated[index].quantity = Math.max(
                        0,
                        updated[index].quantity - 1
                      );
                      setScannedItems(updated);
                    }}
                  >
                    <Text className="text-lg font-bold">−</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-gray-300 rounded-xl px-4 py-2"
                    onPress={() => {
                      const updated = [...scannedItems];
                      updated[index].quantity += 1;
                      setScannedItems(updated);
                    }}
                  >
                    <Text className="text-lg font-bold">+</Text>
                  </TouchableOpacity>
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
