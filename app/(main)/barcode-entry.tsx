import { saveOrderToSync } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Add this import - adjust the path based on your database setup
import { getDatabase } from "@/utils/database"; // Import a function that returns the database instance
// Alternative: if you have a direct import that might be undefined initially:
// import { db } from "@/utils/database";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 50,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    paddingBottom: 80,
    paddingTop: 60,
  },
  content: {
    padding: 16,
  },
  hiddenInput: {
    height: 1,
    width: 1,
    opacity: 0,
    position: 'absolute',
  },
  supplierTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 16,
  },
  cameraContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 256,
    marginBottom: 16,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  camera: {
    flex: 1,
  },
  pausedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedText: {
    color: '#9ca3af',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  getButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  getButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 16,
  },
  productCard: {
    marginBottom: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1.5,
    padding: 10,
  },
  latestProductCard: {
    backgroundColor: '#faf7e6ff',
    borderWidth: 1,
    borderColor: '#fabe09ff',
  },
  regularProductCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 2,
  },
  productBarcode: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    padding: 6,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 6,
    borderRadius: 4,
  },
  productDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
  },
  supplierText: {
    fontWeight: '600',
    color: '#9333ea',
  },
  mrpText: {
    fontWeight: '600',
    color: '#16a34a',
  },
  costText: {
    fontWeight: '600',
    color: '#ea580c',
  },
  stockText: {
    fontWeight: '600',
    color: '#374151',
  },
  // Enhanced styles for E.Qty and E.Cost highlighting
  eQtyContainer: {
    backgroundColor: '#f5e4dfff', // Light blue background
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e24b14ff',
  },
  eQtyText: {
    fontWeight: '700',
    color: '#cb2a15ff', // Dark blue text
    fontSize: 14,
  },
  eQtyValue: {
    fontWeight: '700',
    color: '#cb2a15ff',
    fontSize: 14,
  },
  eCostContainer: {
    backgroundColor: '#f5e4dfff', // Light yellow background
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e24b14ff',
  },
  eCostText: {
    fontWeight: '700',
    color: '#cb2a15ff', // Dark yellow/orange text
    fontSize: 14,
  },
  eCostValue: {
    fontWeight: '700',
    color: '#cb2a15ff',
    fontSize: 14,
  },
  // Styles for edited values
  editedValue: {
    backgroundColor: '#f3e8ff', // Light purple background for edited values
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  editedText: {
    fontWeight: '700',
    color: '#7c3aed', // Purple text for edited values
    fontSize: 14,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonActive: {
    backgroundColor: '#fb923c',
  },
  saveButtonInactive: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 32,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#6b7280',
  },
});

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
            // Mark the item as edited
            newItems[index] = { ...parsedItem, isEdited: true };
          } else {
            // If index is invalid, add as new item
            newItems.unshift({ ...parsedItem, isEdited: true });
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
      // Get the database instance
      const db = await getDatabase();
      
      if (!db) {
        Alert.alert("Error", "Database not available");
        setScanning(true);
        return;
      }

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
          quantity: 0, // Initialize E.Qty as 0 instead of product.quantity
          cost: product.cost ?? product.bmrp ?? 0,
          eCost: 0, // Initialize eCost as 0 (always present)
          currentStock: product.quantity ?? 0, // Keep current stock separate
          batchSupplier: product.batch_supplier ?? supplier,
          scannedAt: new Date().getTime(),
          isEdited: false, // Track if item has been edited
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
      // Get the database instance
      const db = await getDatabase();
      
      if (!db) {
        Alert.alert("Error", "Database not available");
        return;
      }

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
        quantity: 0, // Initialize E.Qty as 0 instead of product.quantity
        cost: product.cost ?? product.bmrp ?? 0,
        eCost: 0, // Initialize eCost as 0 (always present)
        currentStock: product.quantity ?? 0, // Keep current stock separate
        batchSupplier: product.batch_supplier ?? supplier,
        scannedAt: new Date().getTime(),
        isEdited: false, // Track if item has been edited
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

      // Get the database instance
      const db = await getDatabase();
      
      if (!db) {
        Alert.alert("Error", "Database not available");
        return;
      }

      await db.withTransactionAsync(async () => {
        for (const item of scannedItems) {
          // Use eCost if it's not 0, otherwise use cost
          const finalCost = item.eCost !== 0 ? item.eCost : item.cost;
          
          await saveOrderToSync({
            supplier_code: supplier_code,
            userid: userId ?? "unknown",
            barcode: item.barcode,
            quantity: item.quantity,
            rate: finalCost ?? 0,
            mrp: item.bmrp ?? 0,
            order_date: today,
          });

          await db.runAsync(
            "UPDATE product_data SET quantity = ?, cost = ? WHERE barcode = ?",
            [item.quantity, finalCost, item.barcode]
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading scan mode...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Back Button */}
      <View style={styles.backButton}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Hidden Zebra Scanner Input */}
          {scanMode === "hardware" && (
            <TextInput
              ref={inputRef}
              autoFocus
              value={hardwareScanValue}
              onChangeText={(text) => setHardwareScanValue(text)}
              style={styles.hiddenInput}
              showSoftInputOnFocus={false}
              blurOnSubmit={false}
            />
          )}

          <Text style={styles.supplierTitle}>
            Supplier: {supplier} ({supplier_code})
          </Text>

          {/* Camera Scanner */}
          {scanMode === "camera" && (
            <View style={styles.cameraContainer}>
              {scanning ? (
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "code128", "code39", "qr"],
                  }}
                />
              ) : (
                <View style={styles.pausedContainer}>
                  <Text style={styles.pausedText}>Paused</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              placeholder="Enter barcode manually"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              style={styles.textInput}
              keyboardType="default"
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
            />
            <TouchableOpacity
              onPress={handleManualSearch}
              style={styles.getButton}
            >
              <Text style={styles.getButtonText}>Get</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>
            Scanned Products
          </Text>

          {scannedItems.length === 0 && (
            <Text style={styles.emptyText}>
              No products scanned
            </Text>
          )}

          {scannedItems.map((item, index) => (
            <View
              key={`${item.barcode}-${index}`}
              style={[
                styles.productCard,
                index === 0 ? styles.latestProductCard : styles.regularProductCard
              ]}
            >
              {/* Product Name and Actions */}
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.productBarcode}>{item.barcode}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => handleEditItem(item, index)}
                    style={styles.editButton}
                  >
                    <Ionicons name="create-outline" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = scannedItems.filter((_, i) => i !== index);
                      setScannedItems(updated);
                    }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Product Details - Three Lines */}
              <View style={styles.productDetails}>
                {/* First Line: Supplier */}
                <View>
                  <Text style={styles.detailText}>
                    Supplier: <Text style={styles.supplierText}>{item.batchSupplier || 'N/A'}</Text>
                  </Text>
                </View>

                {/* Second Line: MRP, Cost, Stock */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    MRP: <Text style={styles.mrpText}>₹{item.bmrp || 0}</Text>
                  </Text>
                  <Text style={styles.detailText}>
                    Cost: <Text style={styles.costText}>₹{item.cost || 0}</Text>
                  </Text>
                  <Text style={styles.detailText}>
                    Stock: <Text style={styles.stockText}>{item.currentStock}</Text>
                  </Text>
                </View>

                {/* Third Line: E.Qty, E.Cost with enhanced highlighting */}
                <View style={styles.detailRow}>
                  {/* E.Qty with highlighting */}
                  <View style={[
                    styles.eQtyContainer,
                    item.isEdited && item.quantity !== 0 ? styles.editedValue : {}
                  ]}>
                    <Text style={[
                      styles.eQtyText,
                      item.isEdited && item.quantity !== 0 ? styles.editedText : styles.eQtyValue
                    ]}>
                      E.Qty: {item.quantity}
                    </Text>
                  </View>

                  {/* E.Cost with highlighting */}
                  <View style={[
                    styles.eCostContainer,
                    item.isEdited && item.eCost !== 0 ? styles.editedValue : {}
                  ]}>
                    <Text style={[
                      styles.eCostText,
                      item.isEdited && item.eCost !== 0 ? styles.editedText : styles.eCostValue
                    ]}>
                      E.Cost: ₹{item.eCost || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              scannedItems.length > 0 ? styles.saveButtonActive : styles.saveButtonInactive
            ]}
            disabled={scannedItems.length === 0}
            onPress={updateQuantities}
          >
            <Text style={styles.saveButtonText}>
              Update Quantities ({scannedItems.length} items)
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Powered by IMC Business Solutions
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}