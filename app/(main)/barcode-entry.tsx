import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";

import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const db = SQLite.openDatabaseSync("magicpedia.db");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 16,
    zIndex: 50,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
   addManualButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 16,
    zIndex: 50,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
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
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleIcon: {
    marginRight: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
  },
  getButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  getButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  suggestionsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionContent: {
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  suggestionDetailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  detailChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555555',
    marginRight: 3,
  },
  detailChipValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333333',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 16,
    fontSize: 16,
  },
  productCard: {
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1.5,
    padding: 12,
  },
  latestProductCard: {
    backgroundColor: '#faf7e6',
    borderWidth: 1,
    borderColor: '#fabe09',
  },
  regularProductCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  manualEntryCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: -50,
  },
  productHeaderManual: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: -30,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-end',
    
  },
  editButton: {
    backgroundColor: '#3b82f6',
    padding: 10,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 4,
  },
  productDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
  },
  supplierText: {
    fontWeight: '600',
    color: '#6366f1',
  },
  mrpText: {
    fontWeight: '600',
    color: '#059669',
  },
  costText: {
    fontWeight: '600',
    color: '#dc2626',
  },
  stockText: {
    fontWeight: '600',
    color: '#7c3aed',
  },
  eQtyText: {
    fontWeight: '600',
    color: '#ea580c',
  },
  eCostText: {
    fontWeight: '600',
    color: '#0891b2',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ffffff',
    gap: 12,
    marginBottom: 35,
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scannerButton: {
    backgroundColor: '#3b82f6',
  },
  scannerButtonInactive: {
    backgroundColor: '#93c5fd',
  },
  updateButton: {
    backgroundColor: '#10b981',
  },
  updateButtonInactive: {
    backgroundColor: '#d1d5db',
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonSave: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#374151',
  },
  modalButtonTextSave: {
    color: '#ffffff',
  },
  manualEntryBadge: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  manualEntryBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  variantsHeader: {
    padding: 12,
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  addManualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  addManualBackBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  addManualTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  addManualSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  addManualSaveBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  addManualCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addManualFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addManualFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  addManualOptional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9ca3af',
  },
  addManualRequired: {
    color: '#ef4444',
    fontWeight: '700',
  },
  addManualInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  addManualSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  addManualSubmitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#dc2626',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  instructionsText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  nameSuggestionsContainer: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  nameSuggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  nameSuggestionText: {
    fontSize: 14,
    color: '#374151',
  },
  // New styles for quantity selection modal
  quantityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityModalContent: {
    backgroundColor: 'white',
    width: '85%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quantityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  quantityModalCloseButton: {
    padding: 4,
  },
  quantityProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  quantityPriceText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  quantityControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 20,
  },
  quantityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    minWidth: 60,
    textAlign: 'center',
  },
  quantityTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  quantityTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  quantityTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  quantityAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  quantityAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

const initOrdersTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS orders_to_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL DEFAULT '',
        userid TEXT NOT NULL DEFAULT '',
        itemcode TEXT NOT NULL DEFAULT '',
        barcode TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 0,
        rate REAL NOT NULL DEFAULT 0,
        mrp REAL NOT NULL DEFAULT 0,
        order_date TEXT NOT NULL DEFAULT '',
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        product_name TEXT,
        is_manual_entry INTEGER DEFAULT 0,
        text1 TEXT DEFAULT ''
      );
    `);

    // Safely patch any missing columns on existing installs
    const tableInfo: any[] = await db.getAllAsync(`PRAGMA table_info(orders_to_sync)`);
    const cols = tableInfo.map((col: any) => col.name);

    const migrations = [
      { col: 'supplier_code',  def: `ALTER TABLE orders_to_sync ADD COLUMN supplier_code TEXT NOT NULL DEFAULT ''` },
      { col: 'userid',         def: `ALTER TABLE orders_to_sync ADD COLUMN userid TEXT NOT NULL DEFAULT ''` },
      { col: 'itemcode',       def: `ALTER TABLE orders_to_sync ADD COLUMN itemcode TEXT NOT NULL DEFAULT ''` },
      { col: 'barcode',        def: `ALTER TABLE orders_to_sync ADD COLUMN barcode TEXT NOT NULL DEFAULT ''` },
      { col: 'product_name',   def: `ALTER TABLE orders_to_sync ADD COLUMN product_name TEXT DEFAULT ''` },
      { col: 'is_manual_entry',def: `ALTER TABLE orders_to_sync ADD COLUMN is_manual_entry INTEGER DEFAULT 0` },
      { col: 'text1',          def: `ALTER TABLE orders_to_sync ADD COLUMN text1 TEXT DEFAULT ''` },
    ];

    for (const m of migrations) {
      if (!cols.includes(m.col)) {
        console.log(`⚠️ Adding missing column to orders_to_sync: ${m.col}`);
        try {
          await db.execAsync(m.def);
        } catch (e) {
          console.warn(`Could not add column ${m.col}:`, e);
        }
      }
    }

    console.log("✅ orders_to_sync table ready");
  } catch (error) {
    console.error("Error initializing orders_to_sync table:", error);
  }
};

const initPendingItemsTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT,
        barcode TEXT NOT NULL,
        name TEXT NOT NULL,
        bmrp REAL,
        cost REAL,
        quantity INTEGER,
        eCost REAL,
        currentStock INTEGER,
        batchSupplier TEXT,
        scannedAt INTEGER,
        batch_supplier TEXT,
        product TEXT,
        brand TEXT,
        isManualEntry INTEGER DEFAULT 0,
        moreoption TEXT DEFAULT '',
        text1 TEXT DEFAULT ''
      );
    `);

    // Check existing columns and add any that are missing (handles old installs)
    const tableInfo: any[] = await db.getAllAsync(`PRAGMA table_info(pending_items)`);
    const cols = tableInfo.map((col: any) => col.name);

    const migrations = [
      { col: 'supplier_code', def: `ALTER TABLE pending_items ADD COLUMN supplier_code TEXT` },
      { col: 'isManualEntry', def: `ALTER TABLE pending_items ADD COLUMN isManualEntry INTEGER DEFAULT 0` },
      { col: 'moreoption',    def: `ALTER TABLE pending_items ADD COLUMN moreoption TEXT DEFAULT ''` },
      { col: 'text1',         def: `ALTER TABLE pending_items ADD COLUMN text1 TEXT DEFAULT ''` },
    ];

    for (const m of migrations) {
      if (!cols.includes(m.col)) {
        console.log(`⚠️ Adding missing column: ${m.col}`);
        await db.execAsync(m.def);
        console.log(`✅ Added column: ${m.col}`);
      }
    }

    console.log("✅ pending_items table ready");
  } catch (error: any) {
    console.error("❌ Error in initPendingItemsTable:", error);
  }
};

const debugManualEntry = async (barcode: string) => {
  console.log("\n🔍 === DEBUGGING MANUAL ENTRY ===");
  
  try {
    const pendingItem = await db.getFirstAsync(
      `SELECT barcode, name, isManualEntry, supplier_code FROM pending_items WHERE barcode = ?`,
      [barcode]
    ) as any;
    console.log("1️⃣ pending_items table:", JSON.stringify(pendingItem, null, 2));
    
    const syncOrder = await db.getFirstAsync(
      `SELECT barcode, product_name, is_manual_entry, itemcode FROM orders_to_sync WHERE barcode = ? ORDER BY created_at DESC LIMIT 1`,
      [barcode]
    ) as any;
    console.log("2️⃣ orders_to_sync table:", JSON.stringify(syncOrder, null, 2));
    
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(pending_items)`);
    console.log("3️⃣ pending_items schema:");
    tableInfo.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type})`);
    });
  } catch (error) {
    console.error("Debug error:", error);
  }
  
  console.log("🔍 === END DEBUG ===\n");
};

const saveOrderToSync = async (orderData: {
  supplier_code: string;
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  order_date: string;
  product_name?: string;
  is_manual_entry?: number; 
  text1?: string;
}) => {
  try {
    console.log("\n💾 === SAVING ORDER TO SYNC ===");
    console.log("📋 Input orderData:", JSON.stringify(orderData, null, 2));
    
    await db.runAsync(
  `INSERT INTO orders_to_sync 
  (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, order_date, sync_status, created_at, product_name, is_manual_entry, text1)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), ?, ?, ?)`,
  [
    orderData.supplier_code,
    orderData.userid,
    orderData.itemcode,
    orderData.barcode,
    orderData.quantity,
    orderData.rate,
    orderData.mrp,
    orderData.order_date,
    orderData.product_name || '',
    orderData.is_manual_entry || 0,
    orderData.text1 || '',
  ]
);
    
    const saved = await db.getFirstAsync(
      `SELECT barcode, product_name, is_manual_entry FROM orders_to_sync WHERE barcode = ? ORDER BY id DESC LIMIT 1`,
      [orderData.barcode]
    );
    console.log("✅ Verified saved data:", JSON.stringify(saved, null, 2));
    console.log("💾 === END SAVING ===\n");
    
    return true;
  } catch (error: any) {
    console.error("❌ Error saving order to sync:", error);
    throw error;
  }
};

export default function BarcodeEntry() {
  const { supplier, supplier_code, updatedItem, itemIndex } = useLocalSearchParams<{
    supplier: string;
    supplier_code: string;
    updatedItem?: string;
    itemIndex?: string;
  }>();
  const router = useRouter();

  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [hardwareScanValue, setHardwareScanValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [searchMode, setSearchMode] = useState<'barcode' | 'name'>('barcode');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    barcode: '',
    name: '',
    mrp: '',
    cost: '',
    quantity: '',
    size: '',
    _barcodeEditable: false,
  });

  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);
  const processingAlertRef = useRef(false);

  // New state for quantity selection modal
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  const inputRef = useRef<TextInput>(null);

  // Add auto-reset for stuck scanner
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      if (scanned && scanLockRef.current && showScanner) {
        console.log("⚠️ Auto-resetting stuck scanner...");
        setScanned(false);
        scanLockRef.current = false;
        processingAlertRef.current = false;
      }
    }, 5000); // Reset after 5 seconds if stuck

    return () => clearTimeout(resetTimer);
  }, [scanned, showScanner]);

  useEffect(() => {
    const initialize = async () => {
      console.log("🚀 Initializing BarcodeEntry component...");
      await initOrdersTable();
      await initPendingItemsTable();
      await loadPendingItems();
    };
    initialize();
  }, [supplier_code]);

  const loadPendingItems = async () => {
    try {
      // Query with all required columns
      const rows = await db.getAllAsync(
        `SELECT 
          id,
          supplier_code,
          barcode,
          name,
          COALESCE(bmrp, 0) as bmrp,
          COALESCE(cost, 0) as cost,
          COALESCE(quantity, 0) as quantity,
          COALESCE(eCost, 0) as eCost,
          COALESCE(currentStock, 0) as currentStock,
          batchSupplier,
          scannedAt,
          batch_supplier,
          product,
          brand,
          COALESCE(isManualEntry, 0) as isManualEntry,
          moreoption,
          COALESCE(text1, '') as text1
        FROM pending_items 
        WHERE supplier_code = ? 
        ORDER BY scannedAt DESC`,
        [supplier_code || ""]
      );
      
      console.log(`📦 Loaded ${rows.length} pending items for supplier: ${supplier_code}`);
      setScannedItems(rows);
    } catch (error) {
      console.error("❌ Error loading pending items:", error);
      
      // Fallback: Try without supplier_code filter
      try {
        console.log("⚠️ Attempting fallback query without supplier filter...");
        const rows = await db.getAllAsync(
          `SELECT 
            id,
            supplier_code,
            barcode,
            name,
            COALESCE(bmrp, 0) as bmrp,
            COALESCE(cost, 0) as cost,
            COALESCE(quantity, 0) as quantity,
            COALESCE(eCost, 0) as eCost,
            COALESCE(currentStock, 0) as currentStock,
            batchSupplier,
            scannedAt,
            batch_supplier,
            product,
            brand,
            COALESCE(isManualEntry, 0) as isManualEntry,
            moreoption,
            COALESCE(text1, '') as text1
          FROM pending_items 
          ORDER BY scannedAt DESC`
        );
        console.log(`📦 Loaded ${rows.length} pending items (no supplier filter)`);
        setScannedItems(rows);
      } catch (fallbackError) {
        console.error("❌ Fallback query also failed:", fallbackError);
        setScannedItems([]);
      }
    }
  };

  const savePendingItem = async (item: any) => {
    try {
      console.log("\n💾 === SAVING PENDING ITEM ===");
      console.log("Item data:", JSON.stringify(item, null, 2));
      
      await db.runAsync(
       `INSERT INTO pending_items 
        (supplier_code, barcode, name, bmrp, cost, quantity, eCost, currentStock, batchSupplier, scannedAt, batch_supplier, product, brand, isManualEntry, moreoption, text1)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplier_code || "",
          item.barcode ?? "",
          item.name,
          item.bmrp || 0,
          item.cost || 0,
          item.quantity || 0,
          item.eCost || 0,
          item.currentStock || 0,
          item.batchSupplier || supplier,
          item.scannedAt,
          item.batch_supplier || "",
          item.product || "",
          item.brand || "",
          item.isManualEntry || 0,
          item.moreoption || "",
          item.text1 || "",
        ]
      );
      
      const saved = await db.getFirstAsync(
        `SELECT barcode, name, isManualEntry FROM pending_items WHERE barcode = ? ORDER BY id DESC LIMIT 1`,
        [item.barcode]
      );
      console.log("✅ Verified saved pending item:", JSON.stringify(saved, null, 2));
      console.log("💾 === END SAVING PENDING ITEM ===\n");
      
    } catch (error) {
      console.error("Error saving pending item:", error);
    }
  };

  const deletePendingItem = async (itemId: number) => {
    try {
      await db.runAsync(
        "DELETE FROM pending_items WHERE id = ?",
        [itemId]
      );
      console.log(`🗑️ Deleted pending item: ${itemId}`);
    } catch (error) {
      console.error("Error deleting pending item:", error);
    }
  };

  const updatePendingItem = async (itemId: number, item: any) => {
    try {
      await db.runAsync(
        `UPDATE pending_items 
        SET quantity = ?, eCost = ?, cost = ?, batchSupplier = ?, supplier_code = ?
        WHERE id = ?`,
        [item.quantity, item.eCost, item.cost, item.batchSupplier, supplier_code, itemId]
      );
      console.log(`✏️ Updated pending item: ${itemId}`);
    } catch (error) {
      console.error("Error updating pending item:", error);
    }
  };

  useEffect(() => {
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    try {
      const rows = await db.getAllAsync("SELECT * FROM product_data");
      setAllProducts(rows);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  useEffect(() => {
    if (updatedItem && itemIndex !== undefined) {
      try {
        const parsedItem = JSON.parse(updatedItem);
        const index = parseInt(itemIndex);
        
        setScannedItems(prevItems => {
          const newItems = [...prevItems];
          if (index >= 0 && index < newItems.length) {
            newItems[index] = { ...newItems[index], ...parsedItem };
            if (newItems[index].id) {
              updatePendingItem(newItems[index].id, newItems[index]);
            }
          } else {
            newItems.unshift(parsedItem);
          }
          return newItems;
        });

        router.setParams({ 
          updatedItem: undefined, 
          itemIndex: undefined 
        } as any);
      } catch (error) {
        console.error("Error parsing updated item:", error);
      }
    }
  }, [updatedItem, itemIndex]);

  useEffect(() => {
    if (showManualEntryModal || showQuantityModal) {
      return;
    }
    
    const interval = setInterval(() => {
      if (!isEditing && searchMode === 'barcode') {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isEditing, searchMode, showManualEntryModal, showQuantityModal]);

  useEffect(() => {
    if (showManualEntryModal || showQuantityModal) {
      return;
    }
    
    if (searchMode === 'barcode' && hardwareScanValue.length > 0 && hardwareScanValue.trim() !== "") {
      handleBarCodeScanned({ data: hardwareScanValue.trim() }, 'scanner');
      setHardwareScanValue("");
    }
  }, [hardwareScanValue, searchMode, showManualEntryModal, showQuantityModal]);

  useEffect(() => {
    if (!showScanner) {
      setTimeout(() => {
        setScanned(false);
        scanLockRef.current = false;
        processingAlertRef.current = false;
      }, 300);
    }
  }, [showScanner]);

  const toggleSearchMode = () => {
    const newMode = searchMode === 'barcode' ? 'name' : 'barcode';
    setSearchMode(newMode);
    setManualBarcode('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

const handleSearchTextChange = (text: string) => {
  setManualBarcode(text);
  
  if (searchMode === 'name' && text.trim().length >= 2) {
    const searchLower = text.toLowerCase().trim();
    const filtered = allProducts.filter((product: any) => 
      product.name?.toLowerCase().includes(searchLower) ||
      product.brand?.toLowerCase().includes(searchLower) ||
      product.product?.toLowerCase().includes(searchLower)
    ).slice(0, 50);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  } else {
    setSuggestions([]);
    setShowSuggestions(false);
  }
};

  const handleNameInputChange = (text: string) => {
  setManualEntryData({...manualEntryData, name: text});
  setNameSuggestions([]);
  setShowNameSuggestions(false);
};

  const handleSelectNameSuggestion = (name: string) => {
    setManualEntryData({...manualEntryData, name: name});
    setShowNameSuggestions(false);
    setNameSuggestions([]);
    Keyboard.dismiss();
  };

  const handleSelectSuggestion = (product: any) => {
    setManualBarcode(product.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    // Directly add product without quantity modal for item search
    addProductDirectly(product);
  };

  // New function to open quantity modal (only for scanner)
  const openQuantityModal = (product: any) => {
    console.log("📦 Opening quantity modal for:", product.name);
    setSelectedProduct(product);
    setSelectedQuantity(1);
    setShowQuantityModal(true);
  };

  // New function to close quantity modal
  const closeQuantityModal = () => {
    console.log("🔒 Closing quantity modal");
    setShowQuantityModal(false);
    setSelectedProduct(null);
    setSelectedQuantity(1);
    
    // Reset scanner state if it was from scanner
    setTimeout(() => {
      setScanned(false);
      scanLockRef.current = false;
      processingAlertRef.current = false;
      console.log("🔄 Scanner state reset from quantity modal");
    }, 300);
  };

  // New function to handle quantity increase
  const increaseQuantity = () => {
    setSelectedQuantity(prev => prev + 1);
  };

  // New function to handle quantity decrease
  const decreaseQuantity = () => {
    setSelectedQuantity(prev => prev > 1 ? prev - 1 : 1);
  };

  // New function to add product from quantity modal
  const addProductFromQuantityModal = async () => {
    if (!selectedProduct) return;

    const existing = scannedItems.find((item) => item.barcode === selectedProduct.barcode);
    if (existing) {
      Alert.alert("Info", `Product already scanned: ${existing.name}`);
      closeQuantityModal();
      return;
    }

    const newItem = {
      ...selectedProduct,
      quantity: selectedQuantity,
      cost: selectedProduct.cost ?? selectedProduct.bmrp ?? 0,
      eCost: (selectedProduct.cost ?? selectedProduct.bmrp ?? 0) * selectedQuantity,
      currentStock: selectedProduct.quantity ?? 0,
      batchSupplier: selectedProduct.batch_supplier ?? supplier,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
      text1: selectedProduct.text1 || '',
      moreoption: selectedProduct.moreoption || '',
    };
    
    await savePendingItem(newItem);
    await loadPendingItems();
    
    closeQuantityModal();
    setManualBarcode("");
  };

  // New function to add product directly without quantity modal (for manual search and item search)
  const addProductDirectly = async (product: any) => {
    const existing = scannedItems.find((item) => item.barcode === product.barcode);
    if (existing) {
      Alert.alert("Info", `Product already scanned: ${existing.name}`);
      return;
    }

    const newItem = {
      ...product,
      quantity: 1, // Default quantity is 1
      cost: product.cost ?? product.bmrp ?? 0,
      eCost: (product.cost ?? product.bmrp ?? 0) * 1,
      currentStock: product.quantity ?? 0,
      batchSupplier: product.batch_supplier ?? supplier,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
      text1: product.text1 || '',
moreoption: product.text1 || product.moreoption || '',    };
    
    await savePendingItem(newItem);
    await loadPendingItems();
    setManualBarcode("");
  };

  const addProductToList = async (product: any) => {
    // This function now directly adds product without quantity modal
    addProductDirectly(product);
  };

  const searchBarcodeWithVariants = async (barcode: string) => {
    try {
      const exactRows = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode = ?",
        [barcode]
      );

      const variantRows1 = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode LIKE ?",
        [`${barcode} :%`]
      );

      const variantRows2 = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode LIKE ?",
        [`${barcode}:%`]
      );

      const allMatches = [...exactRows, ...variantRows1, ...variantRows2];
      return allMatches;
    } catch (err) {
      console.error("Error searching barcode:", err);
      throw err;
    }
  };

  const openManualEntryModal = (barcode: string) => {
    setManualEntryData({
      barcode: barcode,
      name: '',
      mrp: '',
      cost: '',
      quantity: '',
      size: '',
      _barcodeEditable: false,
    });
    setShowManualEntryModal(true);
    setNameSuggestions([]);
    setShowNameSuggestions(false);
  };

  const closeManualEntryModal = () => {
    setShowManualEntryModal(false);
    setManualEntryData({
      barcode: '',
      name: '',
      mrp: '',
      cost: '',
      quantity: '',
      size: '',
      _barcodeEditable: false,
    });
    setNameSuggestions([]);
    setShowNameSuggestions(false);
  };
  const openAddManualScreen = () => {
    // Open manual entry with empty barcode (null/optional)
    setManualEntryData({
      barcode: '',
      name: '',
      mrp: '',
      cost: '',
      quantity: '',
      size: '',
      _barcodeEditable: true,
    });
    setNameSuggestions([]);
    setShowNameSuggestions(false);
    setShowManualEntryModal(true);
  };

  const handleSaveManualEntry = async () => {
    if (!manualEntryData.name.trim()) {
      Alert.alert("Validation Error", "Please enter an item name");
      return;
    }

    const mrp = parseFloat(manualEntryData.mrp);
    const cost = parseFloat(manualEntryData.cost);
    const quantity = parseInt(manualEntryData.quantity);

    if (isNaN(mrp) || mrp < 0) {
      Alert.alert("Validation Error", "Please enter a valid MRP");
      return;
    }

    if (isNaN(cost) || cost < 0) {
      Alert.alert("Validation Error", "Please enter a valid cost");
      return;
    }

    if (isNaN(quantity) || quantity < 0) {
      Alert.alert("Validation Error", "Please enter a valid quantity");
      return;
    }

    const finalBarcode = manualEntryData.barcode.trim() || `MANUAL-${Date.now()}`;

    const existing = scannedItems.find((item) => item.barcode === finalBarcode);
    if (existing) {
      Alert.alert("Info", `Product with this barcode already exists: ${existing.name}`);
      return;
    }

    console.log("\n🎯 === CREATING MANUAL ENTRY ===");
    console.log("Input data:", {
      barcode: finalBarcode,
      name: manualEntryData.name.trim(),
      isManualEntry: 1
    });

    const newItem = {
      barcode: manualEntryData.barcode.trim() || null,
      name: manualEntryData.name.trim(),
      bmrp: mrp,
      cost: cost,
      quantity: quantity,
      eCost: cost * quantity,
      currentStock: quantity,
      batchSupplier: supplier,
      scannedAt: new Date().getTime(),
      batch_supplier: supplier,
      product: '',
      brand: '',
      moreoption: manualEntryData.size.trim() || '',
      text1: manualEntryData.size.trim() || '',
      isManualEntry: 1,
    };

    console.log("💾 About to save newItem:", JSON.stringify(newItem, null, 2));
    
    await savePendingItem(newItem);
    await loadPendingItems();
    
    await debugManualEntry(finalBarcode);    
    closeManualEntryModal();
    Alert.alert("Success", "Product added successfully!");
  };

  const handleBarCodeScanned = async ({ data }: { data: string }, source: 'scanner' | 'manual' = 'scanner') => {
    console.log(`🔍 Scanning barcode: ${data}, source: ${source}`);
    
    // If from scanner and already processing, skip
    if (source === 'scanner') {
      if (scanLockRef.current) {
        console.log("⏸️ Scan locked, skipping...");
        return;
      }
      scanLockRef.current = true;
      setScanned(true);
      
      // Close scanner immediately for better UX
      if (showScanner) {
        setShowScanner(false);
      }
    }

    try {
      console.log(`🔎 Searching for barcode: ${data}`);
      const allMatches = await searchBarcodeWithVariants(data);

     if (allMatches.length === 0) {
        console.log("❌ No matches found");
        Alert.alert(
          "Product not found",
          `Barcode: ${data}\n\nNo product found for this barcode.`,
          [
            {
              text: 'OK',
              style: 'cancel',
              onPress: () => {
                if (source === 'scanner') {
                  setScanned(false);
                  scanLockRef.current = false;
                  processingAlertRef.current = false;
                }
              }
            }
          ]
        );
        return;
      }

      if (allMatches.length === 1) {
        const product = allMatches[0] as { [key: string]: any; quantity?: number };
        const existing = scannedItems.find((item) => item.barcode === product.barcode);
        
        if (existing) {
          console.log("⚠️ Product already exists:", existing.name);
          Alert.alert("Info", `Product already scanned: ${existing.name}`, [
            {
              text: 'OK',
              onPress: () => {
                // RESET SCANNER STATE
                if (source === 'scanner') {
                  setScanned(false);
                  scanLockRef.current = false;
                  processingAlertRef.current = false;
                }
              }
            }
          ]);
          return;
        }

        console.log("✅ Found product:", product.name);
        
        // Only open quantity modal if from scanner (camera)
        if (source === 'scanner') {
          openQuantityModal(product);
        } else {
          // For manual barcode entry, add directly without modal
          addProductDirectly(product);
          
          // Reset state if from scanner
          if (source === 'scanner') {
            setTimeout(() => {
              setScanned(false);
              scanLockRef.current = false;
            }, 500);
          }
        }
      } else {
        console.log(`📋 Found ${allMatches.length} variants`);
        setSuggestions(allMatches);
        setShowSuggestions(true);
        
        // Reset scanner state
        if (source === 'scanner') {
          setTimeout(() => {
            setScanned(false);
            scanLockRef.current = false;
          }, 500);
        }
      }
    } catch (err) {
      console.error("❌ Error fetching product:", err);
      Alert.alert("Error", "Failed to scan product.", [
        {
          text: 'OK',
          onPress: () => {
            // RESET SCANNER STATE ON ERROR
            if (source === 'scanner') {
              setScanned(false);
              scanLockRef.current = false;
              processingAlertRef.current = false;
            }
          }
        }
      ]);
    }
  };

  const handleManualSearch = async () => {
    const trimmed = manualBarcode.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter a search term");
      return;
    }

    if (searchMode === 'barcode') {
      try {
        const allMatches = await searchBarcodeWithVariants(trimmed);

        if (allMatches.length === 0) {
          Alert.alert(
            "Product not found",
            `Barcode: ${trimmed}\n\nNo product found for this barcode.`,
            [
              { text: 'OK', style: 'cancel' }
            ]
          );
          return;
        }

        if (allMatches.length === 1) {
          const product = allMatches[0];
          const existing = scannedItems.find((item) => item.barcode === product.barcode);
          
          if (existing) {
            Alert.alert("Info", `Product already scanned: ${existing.name}`);
            return;
          }
          
          // Manual barcode search - add directly without quantity modal
          addProductDirectly(product);
        } else {
          setSuggestions(allMatches);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Error searching barcode:", err);
        Alert.alert("Error", "Failed to search barcode");
      }
    } else {
      const searchLower = trimmed.toLowerCase();
      const filtered = allProducts.filter((product: any) => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.product?.toLowerCase().includes(searchLower)
      );

      if (filtered.length === 0) {
        Alert.alert("No results", `No products found matching "${trimmed}"`);
        return;
      }

      setSuggestions(filtered);
      setShowSuggestions(true);
    }
  };

  const handleToggleScanner = async () => {
    console.log("📷 Opening scanner...");
    
    // Reset scanner state before opening
    setScanned(false);
    scanLockRef.current = false;
    processingAlertRef.current = false;
    
    if (!permission?.granted) {
      console.log("🔐 Requesting camera permission...");
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Camera Permission",
          "Camera access is required to scan barcodes."
        );
        return;
      }
    }
    
    console.log("✅ Opening camera scanner");
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    console.log("🔒 Closing scanner");
    setShowScanner(false);
    
    // Reset ALL scanner states after a delay
    setTimeout(() => {
      setScanned(false);
      scanLockRef.current = false;
      processingAlertRef.current = false;
      console.log("🔄 Scanner state reset");
    }, 300);
  };

  const handleDeleteItem = async (index: number) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const item = scannedItems[index];
            if (item.id) {
              await deletePendingItem(item.id);
            }
            await loadPendingItems();
          },
        },
      ]
    );
  };

  const handleEditItem = (item: any, index: number) => {
    router.push({
      pathname: "/edit-product",
      params: {
        supplier: supplier || "",
        supplier_code: supplier_code || "",
        item: JSON.stringify(item),
        itemIndex: index.toString(),
      },
    });
  };

  const updateQuantities = async () => {
    if (scannedItems.length === 0) {
      Alert.alert("No items", "Please scan items before updating quantities.");
      return;
    }

    Alert.alert(
      "Confirm Update",
      `Update quantities for ${scannedItems.length} item(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
  try {
    const userid = await SecureStore.getItemAsync("user_id");
    if (!userid) {
      Alert.alert("Error", "User not logged in. Please login again.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    for (const item of scannedItems) {
      console.log("\n🔄 === PROCESSING ITEM FOR UPDATE ===");
      console.log("Item barcode:", item.barcode);
      console.log("Item name:", item.name);
      console.log("isManualEntry:", item.isManualEntry);
      
 const isManual = item.isManualEntry === 1;
const manualHasBarcode = isManual && item.barcode && !String(item.barcode).startsWith('MANUAL-');

const orderData = {
  supplier_code: supplier_code || "",
  userid: userid,
  itemcode: isManual ? (manualHasBarcode ? item.barcode : "") : (item.code || item.barcode || ""),
  barcode: isManual ? (manualHasBarcode ? item.barcode : "") : (item.barcode || ""),
  quantity: item.quantity,
  rate: item.cost || 0,
  mrp: item.bmrp || 0,
  order_date: today,
  product_name: item.name,
  is_manual_entry: item.isManualEntry || 0,
  text1: item.text1 || item.moreoption || (item.barcode?.includes(':') ? item.barcode.split(':').pop()?.trim() : '') || '',
};

      console.log("📤 Saving order with data:", JSON.stringify(orderData, null, 2));
      await saveOrderToSync(orderData);

      if (item.id) {
        await deletePendingItem(item.id);
      }
    }

    await loadPendingItems();
    Alert.alert(
      "✅ Data Saved Locally",
      `All ${scannedItems.length} entries saved successfully!\n\nDo you want to upload to the server now?`,
      [
        {
          text: "No",
          style: "cancel",
          onPress: () => router.back(),
        },
        {
          text: "Yes, Upload Now",
          onPress: () => router.push("/(main)/upload"), // 👈 change this path to your actual upload screen
        },
      ]
    );
  } catch (error) {
    console.error("Error updating quantities:", error);
    Alert.alert("Error", "Failed to update quantities");
  }
},
        },
      ]
    );
  };

  const getCardStyle = (item: any, index: number) => {
    if (item.isManualEntry === 1) {
      return styles.manualEntryCard;
    }
    return index === 0 ? styles.latestProductCard : styles.regularProductCard;
  };

  const renderSuggestionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(item)}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName} numberOfLines={1}>
          {item.name}
        </Text>
     
        <View style={styles.suggestionDetailsContainer}>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Barcode:</Text>
            <Text style={styles.detailChipValue}>
              {item.barcode}
              {item.moreoption ? `  |  Size: ${item.moreoption}` : ''}
              {item.text1 ? `  |  ${item.text1}` : ''}
            </Text>
          </View>
          {item.brand && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Brand:</Text>
              <Text style={styles.detailChipValue}>{item.brand}</Text>
            </View>
          )}
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>MRP:</Text>
            <Text style={styles.detailChipValue}>₹{item.bmrp || 0}</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Cost:</Text>
            <Text style={styles.detailChipValue}>₹{item.cost || 0}</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Stock:</Text>
            <Text style={styles.detailChipValue}>{item.quantity || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#3b82f6" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addManualButton}
        onPress={() => openAddManualScreen()}
      >
        <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
      </TouchableOpacity>

      <Modal
        visible={showManualEntryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeManualEntryModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#f3f4f6' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.addManualHeader}>
            <TouchableOpacity onPress={closeManualEntryModal} style={styles.addManualBackBtn}>
              <Ionicons name="close" size={22} color="#3b82f6" />
            </TouchableOpacity>
            <Text style={styles.addManualTitle}>Add Product Manually</Text>
            <TouchableOpacity onPress={handleSaveManualEntry} style={styles.addManualSaveBtn}>
              <Text style={styles.addManualSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Barcode field */}
            <View style={styles.addManualCard}>
              <View style={styles.addManualFieldRow}>
                <Ionicons name="barcode-outline" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text style={styles.addManualFieldLabel}>Barcode <Text style={styles.addManualOptional}>(optional)</Text></Text>
              </View>
              <TextInput
                style={[
                  styles.addManualInput,
                  !manualEntryData._barcodeEditable && { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                ]}
                value={manualEntryData.barcode}
                editable={!!manualEntryData._barcodeEditable}
                placeholder="Enter barcode or leave empty"
                placeholderTextColor="#9ca3af"
                onChangeText={(text) => setManualEntryData({...manualEntryData, barcode: text})}
                keyboardType="default"
              />
            </View>

            {/* Item Name */}
            <View style={styles.addManualCard}>
              <View style={styles.addManualFieldRow}>
                <Ionicons name="cube-outline" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text style={styles.addManualFieldLabel}>Item Name <Text style={styles.addManualRequired}>*</Text></Text>
              </View>
              <TextInput
                style={styles.addManualInput}
                value={manualEntryData.name}
                onChangeText={handleNameInputChange}
                placeholder="Enter item name"
                placeholderTextColor="#9ca3af"
                autoFocus
              />
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <ScrollView style={styles.nameSuggestionsContainer} keyboardShouldPersistTaps="handled">
                  {nameSuggestions.map((name, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.nameSuggestionItem}
                      onPress={() => handleSelectNameSuggestion(name)}
                    >
                      <Ionicons name="search" size={14} color="#9ca3af" style={{ marginRight: 6 }} />
                      <Text style={styles.nameSuggestionText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* MRP & Cost row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.addManualCard, { flex: 1 }]}>
                <View style={styles.addManualFieldRow}>
                  <Ionicons name="pricetag-outline" size={18} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.addManualFieldLabel}>MRP <Text style={styles.addManualRequired}>*</Text></Text>
                </View>
                <TextInput
                  style={styles.addManualInput}
                  value={manualEntryData.mrp}
                  onChangeText={(text) => setManualEntryData({...manualEntryData, mrp: text})}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.addManualCard, { flex: 1 }]}>
                <View style={styles.addManualFieldRow}>
                  <Ionicons name="cash-outline" size={18} color="#dc2626" style={{ marginRight: 6 }} />
                  <Text style={styles.addManualFieldLabel}>Cost <Text style={styles.addManualRequired}>*</Text></Text>
                </View>
                <TextInput
                  style={styles.addManualInput}
                  value={manualEntryData.cost}
                  onChangeText={(text) => setManualEntryData({...manualEntryData, cost: text})}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.addManualCard}>
              <View style={styles.addManualFieldRow}>
                <Ionicons name="layers-outline" size={20} color="#7c3aed" style={{ marginRight: 8 }} />
                <Text style={styles.addManualFieldLabel}>Quantity <Text style={styles.addManualRequired}>*</Text></Text>
              </View>
              <TextInput
                style={styles.addManualInput}
                value={manualEntryData.quantity}
                onChangeText={(text) => setManualEntryData({...manualEntryData, quantity: text})}
                placeholder="Enter quantity"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
              />
            </View>
            {/* Size */}
            <View style={styles.addManualCard}>
              <View style={styles.addManualFieldRow}>
                <Ionicons name="resize-outline" size={20} color="#0891b2" style={{ marginRight: 8 }} />
                <Text style={styles.addManualFieldLabel}>Size <Text style={styles.addManualOptional}>(optional)</Text></Text>
              </View>
              <TextInput
                style={styles.addManualInput}
                value={manualEntryData.size}
                onChangeText={(text) => setManualEntryData({...manualEntryData, size: text})}
                placeholder="e.g. 500ml, L, XL, 1kg"
                placeholderTextColor="#9ca3af"
              />
            </View>


            {/* Save Button */}
            <TouchableOpacity style={styles.addManualSubmitBtn} onPress={handleSaveManualEntry}>
              <Ionicons name="checkmark-circle" size={22} color="white" />
              <Text style={styles.addManualSubmitBtnText}>Add Product</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showQuantityModal}
        transparent
        animationType="fade"
        onRequestClose={closeQuantityModal}
      >

       <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
        <View style={styles.quantityModalOverlay}>
          <View style={styles.quantityModalContent}>
            {selectedProduct && (
              <>
                <View style={styles.quantityModalHeader}>
                  <Text style={styles.quantityModalTitle}>Select Quantity</Text>
                  <TouchableOpacity 
                    onPress={closeQuantityModal}
                    style={styles.quantityModalCloseButton}
                  >
                    <Ionicons name="close-circle" size={28} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.quantityProductName} numberOfLines={2}>
                  {selectedProduct.name}
                </Text>
                <Text style={styles.quantityPriceText}>
                  Price: ₹{selectedProduct.cost ?? selectedProduct.bmrp ?? 0} per unit
                </Text>

                <View style={styles.quantityControlContainer}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={decreaseQuantity}
                  >
                    <Ionicons name="remove" size={24} color="#3b82f6" />
                  </TouchableOpacity>
                  
                  <TextInput
                    value={selectedQuantity.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      if (num >= 0) setSelectedQuantity(num);
                    }}
                    keyboardType="numeric"
                    style={styles.quantityValue}
                    selectTextOnFocus={true}
                  />

                  
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={increaseQuantity}
                  >
                    <Ionicons name="add" size={24} color="#3b82f6" />
                  </TouchableOpacity>
                </View>

                <View style={styles.quantityTotalContainer}>
                  <Text style={styles.quantityTotalLabel}>Total:</Text>
                  <Text style={styles.quantityTotalValue}>
                    {((selectedProduct.cost ?? selectedProduct.bmrp ?? 0) * selectedQuantity).toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.quantityAddButton}
                  onPress={addProductFromQuantityModal}
                >
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.quantityAddButtonText}>Add to Cart</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={handleCloseScanner}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : (data) => {
              console.log("📸 Camera captured barcode");
              handleBarCodeScanned(data, 'scanner');
            }}
            barcodeScannerSettings={{
              barcodeTypes: [
                "qr",
                "ean13",
                "ean8",
                "code128",
                "code39",
                "upc_a",
                "upc_e",
                "code93",
                "itf14",
              ],
            }}
          >
            <View style={styles.scannerOverlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseScanner}
              >
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>

              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>

              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  {scanned ? 'Processing...' : 'Align barcode within the frame'}
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      {searchMode === 'barcode' && !showManualEntryModal && !showQuantityModal && (
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

      <View style={styles.header}>
        <Text style={styles.supplierTitle}>
          Supplier: {supplier} ({supplier_code})
        </Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              styles.toggleButtonLeft,
              searchMode === 'barcode' && styles.toggleButtonActive
            ]}
            onPress={() => searchMode !== 'barcode' && toggleSearchMode()}
          >
            <Ionicons 
              name="barcode-outline" 
              size={18} 
              color={searchMode === 'barcode' ? '#FFFFFF' : '#666666'} 
              style={styles.toggleIcon}
            />
            <Text style={[
              styles.toggleText,
              searchMode === 'barcode' && styles.toggleTextActive
            ]}>
              Barcode Search
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              searchMode === 'name' && styles.toggleButtonActive
            ]}
            onPress={() => searchMode !== 'name' && toggleSearchMode()}
          >
            <Ionicons 
              name="search" 
              size={18} 
              color={searchMode === 'name' ? '#FFFFFF' : '#666666'} 
              style={styles.toggleIcon}
            />
            <Text style={[
              styles.toggleText,
              searchMode === 'name' && styles.toggleTextActive
            ]}>
              Item Search
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder={searchMode === 'barcode' ? 'Enter barcode manually' : 'Search by name...'}
            value={manualBarcode}
            onChangeText={handleSearchTextChange}
            style={styles.textInput}
            keyboardType="default"
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
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
      </View>

      {showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          {searchMode === 'barcode' && suggestions.length > 1 && (
            <Text style={styles.variantsHeader}>
              Found {suggestions.length} variants - Select one:
            </Text>
          )}
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.barcode}-${index}`}
            renderItem={renderSuggestionItem}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      ) : (
        <>
          <View style={styles.scrollView}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Text style={styles.sectionTitle}>
                Scanned Products ({scannedItems.length})
              </Text>
            </View>

            {scannedItems.length === 0 ? (
              <Text style={styles.emptyText}>
                No products scanned yet. Start scanning or enter a {searchMode === 'barcode' ? 'barcode' : 'product name'} manually.
              </Text>
            ) : (
              <FlatList
                data={scannedItems}
                keyExtractor={(item, index) => `${item.id || item.barcode}-${index}`}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.productCard,
                      getCardStyle(item, index),
                      { marginHorizontal: 16 }
                    ]}
                  >
                   <View style={item.isManualEntry === 1 ? styles.productHeaderManual : styles.productHeader}>
                      <View style={styles.productInfo}>
                        {item.isManualEntry === 1 && (
                          <View style={styles.manualEntryBadge}>
                            <Text style={styles.manualEntryBadgeText}>MANUAL ENTRY</Text>
                          </View>
                        )}
                        <Text style={styles.productName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {!(item.isManualEntry === 1 && item.barcode?.startsWith('MANUAL-')) && (
                        <Text style={styles.productBarcode}>
                          {item.barcode}
                          {item.moreoption ? `  |  Size: ${item.moreoption}` : ''}
                          {item.text1 ? `  |  ${item.text1}` : ''}
                        </Text>
                      )}
                      {item.isManualEntry === 1 && item.barcode?.startsWith('MANUAL-') ? (
                        <Text style={styles.productBarcode}>
                          {item.moreoption ? `Size: ${item.moreoption}` : ''}
                          {item.moreoption && item.text1 ? '  |  ' : ''}
                          {item.text1 || ''}
                        </Text>
                      ) : null}
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(index)}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={20} color="white" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          onPress={() => handleEditItem(item, index)}
                          style={styles.editButton}
                        >
                          <Ionicons name="create-outline" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.productDetails}>
                      <View>
                        <Text style={styles.detailText}>
                          Supplier: <Text style={styles.supplierText}>{item.batchSupplier || 'N/A'}</Text>
                        </Text>
                      </View>

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

                     <View style={styles.detailRow}>
                        <Text style={styles.detailText}>
                          E.Qty: <Text style={styles.eQtyText}>{item.quantity}</Text>
                        </Text>
                        <Text style={styles.detailText}>
                          E.Cost: <Text style={styles.eCostText}>₹{item.eCost || 0}</Text>
                        </Text>
                        <Text style={styles.detailText}>
                          Size: <Text style={styles.eQtyText}>{item.text1 || 'Null'}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 16, paddingTop: 4 }}
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
                ListFooterComponent={
                  <View style={[styles.footer, { marginHorizontal: 16 }]}>
                    <Text style={styles.footerText}>
                      Powered by IMC Business Solutions
                    </Text>
                  </View>
                }
              />
            )}
          </View>

          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={[
                styles.bottomButton,
                scannedItems.length > 0 ? styles.updateButton : styles.updateButtonInactive
              ]}
              disabled={scannedItems.length === 0}
              onPress={updateQuantities}
            >
              <Ionicons name="checkmark-done" size={24} color="white" />
              <Text style={styles.bottomButtonText}>
                Upload ({scannedItems.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bottomButton,
                styles.scannerButton
              ]}
              onPress={handleToggleScanner}
            >
              <Ionicons
                name="camera"
                size={24}
                color="white"
              />
              <Text style={styles.bottomButtonText}>
                Camera
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}