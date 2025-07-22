import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("magicpedia.db");

export default function BarcodeEntry() {
  const { supplier } = useLocalSearchParams();
  const router = useRouter();

  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (hasPermission === null) {
      requestPermission();
    }
  }, [hasPermission]);

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
          quantity: product.quantity ?? 1, // use DB value if exists
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
      await db.withTransactionAsync(async () => {
        for (const item of scannedItems) {
          await db.runAsync(
            "UPDATE product_data SET quantity = ? WHERE barcode = ?",
            [item.quantity, item.barcode]
          );
        }
      });
      Alert.alert("✅ Success", "Quantities updated successfully!");
      setScannedItems([]);
      router.back(); // Navigate back to supplier screen
    } catch (err) {
      console.error("❌ Update failed:", err);
      Alert.alert("Error", "Failed to update quantities.");
    }
  };

  if (hasPermission?.status !== "granted") {
    Alert.alert(
      "Permission Required",
      "Camera access is needed to scan barcodes.",
      [
        { text: "OK", onPress: () => requestPermission() },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold mb-4 mt-20">
        Supplier: {String(supplier)}
      </Text>

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

      <Text className="text-lg font-semibold mb-2">Scanned Products</Text>
      <FlatList
        data={scannedItems}
        keyExtractor={(item) => item.barcode}
        renderItem={({ item, index }) => (
          <View className="mb-2 border p-3 rounded-lg bg-gray-100">
            <Text className="font-semibold">{item.name}</Text>
            <Text className="text-xs text-gray-500">
              Barcode: {item.barcode}
            </Text>
            <TextInput
              keyboardType="numeric"
              className="border p-2 mt-2 rounded"
              value={item.quantity.toString()}
              onChangeText={(val) => {
                const updated = [...scannedItems];
                updated[index].quantity = parseInt(val) || 0;
                setScannedItems(updated);
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-gray-500 italic">No products scanned</Text>
        }
      />

      <TouchableOpacity
        className="mt-4 bg-green-600 p-4 rounded-xl"
        onPress={updateQuantities}
        disabled={scannedItems.length === 0}
      >
        <Text className="text-white text-center font-bold">
          Update Quantities
        </Text>
      </TouchableOpacity>
    </View>
  );
}
