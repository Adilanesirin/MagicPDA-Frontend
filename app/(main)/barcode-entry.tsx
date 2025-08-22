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
  const { supplier, supplier_code, updatedItem, itemIndex } = useLocalSearchParams<{
    supplier: string;
    supplier_code: string;
    updatedItem?: string;
    itemIndex?: string;
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

  // Handle updated item from edit page
  useEffect(() => {
    if (updatedItem && itemIndex !== undefined) {
      try {
        const parsedItem = JSON.parse(updatedItem);
        const index = parseInt(itemIndex);
        
        setScannedItems(prevItems => {
          const newItems = [...prevItems];
          if (index >= 0 && index < newItems.length) {
            newItems[index] = parsedItem;
          } else {
            // If index is invalid, add as new item
            newItems.unshift(parsedItem);
          }
          return newItems;
        });

        // Clear the parameters to prevent re-processing
        router.setParams({ updatedItem: undefined, itemIndex: undefined });
      } catch (error) {
        console.error("Error parsing updated item:", error);
      }
    }
  }, [updatedItem, itemIndex]);

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
        setScanning(true);
        return;
      }

      const product = rows[0] as { [key: string]: any; quantity?: number };
      if (typeof product === "object" && product !== null) {
        const newItem = {
          ...product,
          quantity: product.quantity ?? 1,
          cost: product.cost ?? product.bmrp ?? 0,
          currentStock: product.quantity ?? 0,
          batchSupplier: product.batch_supplier ?? supplier,
          scannedAt: new Date().getTime(),
        };
        setScannedItems((prev) => [newItem, ...prev]);
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
        cost: product.cost ?? product.bmrp ?? 0,
        currentStock: product.quantity ?? 0,
        batchSupplier: product.batch_supplier ?? supplier,
        scannedAt: new Date().getTime(),
      };

      setScannedItems((prev) => [newItem, ...prev]);
      setManualBarcode("");
    } catch (err) {
      console.error("❌ Error fetching product:", err);
      Alert.alert("Error", "Failed to fetch product.");
    }
  };

  const handleEditItem = (item: any, index: number) => {
    // Navigate to edit page with item data
    router.push({
      pathname: "/edit-product",
      params: {
        itemData: JSON.stringify(item),
        itemIndex: index.toString(),
        supplier,
        supplier_code,
      },
    });
  };

  const updateQuantities = async () => {
    try {
      const userId = await SecureStore.getItemAsync("user_id");
      const today = new Date().toISOString().split("T")[0];

      await db.withTransactionAsync(async () => {
        for (const item of scannedItems) {
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
            "UPDATE product_data SET quantity = ?, cost = ? WHERE barcode = ?",
            [item.quantity, item.cost, item.barcode]
          );
        }
      });

      Alert.alert("✅ Success", "Entries saved for sync!");
      setScannedItems([]);
      router.push("/");
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
        <TouchableOpacity onPress={handleBack}>
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
              key={`${item.barcode}-${index}`}
              className="mb-2 bg-white rounded-lg shadow-sm border border-gray-200 p-3"
            >
              {/* Product Name and Actions */}
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-base text-gray-800 mb-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-sm text-gray-500">{item.barcode}</Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEditItem(item, index)}
                    className="bg-blue-500 p-2 rounded"
                  >
                    <Ionicons name="create-outline" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = scannedItems.filter((_, i) => i !== index);
                      setScannedItems(updated);
                    }}
                    className="bg-red-500 p-2 rounded"
                  >
                    <Ionicons name="trash-outline" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Product Details - Two Rows */}
              <View className="space-y-1">
                {/* First Row: Qty, Cost, MRP */}
                <View className="flex-row items-center gap-4">
                  <Text className="text-sm text-gray-600">
                    Qty: <Text className="font-semibold text-blue-600">{item.quantity}</Text>
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Cost: <Text className="font-semibold text-orange-600">₹{item.cost || 0}</Text>
                  </Text>
                  <Text className="text-sm text-gray-600">
                    MRP: <Text className="font-semibold text-green-600">₹{item.bmrp || 0}</Text>
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Stock: <Text className="font-semibold text-gray-700">{item.currentStock}</Text>
                  </Text>
                </View>

                {/* Second Row: Supplier */}
                <View>
                  <Text className="text-sm text-gray-600">
                    Supplier: <Text className="font-semibold text-purple-600">{item.batchSupplier || 'N/A'}</Text>
                  </Text>
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
              Update Quantities ({scannedItems.length} items)
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