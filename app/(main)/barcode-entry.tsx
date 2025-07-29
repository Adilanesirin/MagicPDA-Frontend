import {
  View,
  Text,
  FlatList,
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
      <View className="flex-1 p-4">
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

        <Text className="text-xl font-bold mb-4">
          Supplier: {supplier} ({supplier_code})
        </Text>

        {/* Camera Scanner View */}
        {scanMode === "camera" && (
          <View className="rounded-xl overflow-hidden h-64 mb-4 border">
            {scanning && (
              <CameraView
                style={{ flex: 1 }}
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "code128", "code39", "qr"],
                }}
              />
            )}
          </View>
        )}

        <Text className="text-lg font-semibold mb-2">Scanned Products</Text>

        <FlatList
          data={scannedItems}
          keyExtractor={(item) => item.barcode}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <View className="mb-2 border p-3 rounded-lg bg-gray-100">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-semibold flex-1">{item.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const updated = scannedItems.filter((_, i) => i !== index);
                    setScannedItems(updated);
                  }}
                >
                  <Text className="text-red-500 font-bold">✖</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-gray-500 mb-2">
                Barcode: {item.barcode}
              </Text>

              <View className="flex-row items-center justify-between">
                <TextInput
                  keyboardType="numeric"
                  className="border mx-2 p-2 w-28 text-center rounded"
                  value={item.quantity.toString()}
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                  onChangeText={(val) => {
                    const updated = [...scannedItems];
                    updated[index].quantity = parseInt(val) || 0;
                    setScannedItems(updated);
                  }}
                />

                <View className="flex-row">
                  <TouchableOpacity
                    className="bg-gray-300 px-6 py-1 mr-8 rounded"
                    onPress={() => {
                      const updated = [...scannedItems];
                      updated[index].quantity = Math.max(
                        0,
                        updated[index].quantity - 1
                      );
                      setScannedItems(updated);
                    }}
                  >
                    <Text className="text-lg font-bold">-</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-gray-300 px-6 py-1 rounded"
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
          )}
          ListEmptyComponent={
            <Text className="text-gray-500 italic">No products scanned</Text>
          }
        />

        <TouchableOpacity
          className="mt-4 bg-green-600 p-4 rounded-xl mb-10"
          onPress={updateQuantities}
          disabled={scannedItems.length === 0}
        >
          <Text className="text-white text-center font-bold">
            Update Quantities
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
