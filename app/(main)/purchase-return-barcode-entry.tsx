import { saveReturnToSync } from "@/utils/sync";
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
    backgroundColor: '#ffffff',
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
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  scanButton: {
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
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
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
    color: '#b01111',
    marginBottom: 16,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#faeeee',
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
    borderRightColor: '#fecaca',
  },
  toggleButtonActive: {
    backgroundColor: '#b01111',
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
    borderColor: '#fde2e2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
  },
  getButton: {
    backgroundColor: '#b01111',
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
    borderColor: '#fecaca',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
  },
  suggestionContent: {
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7f1d1d',
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
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  detailChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
    marginRight: 3,
  },
  detailChipValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7f1d1d',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  itemsScrollContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#7f1d1d',
  },
  emptyText: {
    textAlign: 'center',
    color: '#978c8c',
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
    position: 'relative',
  },
  latestProductCard: {
    backgroundColor: '#fef7e6',
    borderWidth: 1,
    borderColor: '#fabfbf',
  },
  regularProductCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  manualEntryCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#f9caca',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: -50,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#7f1d1d',
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 14,
    color: '#b91c1c',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#3ab847',
    padding: 10,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#991d1b',
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
    color: '#991b1b',
  },
  supplierText: {
    fontWeight: '600',
    color: '#991b1b',
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
    color: '#7f1d1d',
  },
  eQtyText: {
    fontWeight: '600',
    color: '#dc2626',
  },
  eCostText: {
    fontWeight: '600',
    color: '#991b1b',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  footerText: {
    textAlign: 'center',
    color: '#b91c1c',
    fontSize: 12,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
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
    backgroundColor: '#16a34a',
  },
  scannerButtonInactive: {
    backgroundColor: '#93c5fd',
  },
  updateButton: {
    backgroundColor: '#b01111',
  },
  updateButtonInactive: {
    backgroundColor: '#fca5a5',
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  variantsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f1d1d',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    backgroundColor: '#b01111',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 200,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f1d1d',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#f8eaea',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#7f1d1d',
  },
  formInputDisabled: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#fecaca',
  },
  modalButtonSave: {
    backgroundColor: '#dc2626',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#7f1d1d',
  },
  modalButtonTextSave: {
    color: '#ffffff',
  },
  manualEntryBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  manualEntryBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  autocompleteSuggestionsWrapper: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 1001,
  },
  autocompleteSuggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
  },
  autocompleteSuggestionText: {
    fontSize: 15,
    color: '#7f1d1d',
  },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    color: '#7f1d1d',
    flex: 1,
  },
  quantityModalCloseButton: {
    padding: 4,
  },
  quantityProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  quantityPriceText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
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
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7f1d1d',
    minWidth: 60,
    textAlign: 'center',
  },
  quantityTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  quantityTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f1d1d',
  },
  quantityTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  quantityAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b01111',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  quantityAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

const initReturnsTable = async () => {
  try {
    console.log("🔄 Initializing returns_to_sync table...");
    
    await db.execAsync(`DROP TABLE IF EXISTS returns_to_sync`);
    
    await db.execAsync(`
      CREATE TABLE returns_to_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL,
        userid TEXT NOT NULL,
        itemcode TEXT NOT NULL,
        barcode TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        rate REAL NOT NULL,
        mrp REAL NOT NULL,
        return_date TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        product_name TEXT,
        is_manual_entry INTEGER DEFAULT 0,
        return_reason TEXT DEFAULT ''
      );
    `);
    
    console.log("✅ returns_to_sync table created successfully");
    
  } catch (error) {
    console.error("❌ Error initializing returns table:", error);
  }
};

const initPendingReturnsTable = async () => {
  try {
    console.log("🔄 Initializing pending_returns table...");
    
    // First, check if table exists
    const tableExists = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pending_returns'"
    ) as any;
    
    if (!tableExists) {
      // Create new table with complete schema
      await db.execAsync(`
        CREATE TABLE pending_returns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_code TEXT NOT NULL DEFAULT '',
          barcode TEXT NOT NULL,
          name TEXT,
          bmrp REAL DEFAULT 0,
          cost REAL DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          eCost REAL DEFAULT 0,
          currentStock INTEGER DEFAULT 0,
          batchSupplier TEXT,
          scannedAt INTEGER,
          batch_supplier TEXT,
          product TEXT,
          brand TEXT,
          isManualEntry INTEGER DEFAULT 0,
          return_reason TEXT DEFAULT ''
        );
      `);
      console.log("✅ Created pending_returns table with complete schema");
      return;
    }
    
    // Table exists, get its column information
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(pending_returns)`) as Array<{name: string}>;
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log("📋 Existing columns in pending_returns:", existingColumns.join(", "));
    
    // Define required columns
    const requiredColumns = [
      'id', 'supplier_code', 'barcode', 'name', 'bmrp', 'cost', 
      'quantity', 'eCost', 'currentStock', 'batchSupplier', 
      'scannedAt', 'batch_supplier', 'product', 'brand', 'isManualEntry', 'return_reason'
    ];
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log("🔄 Migrating pending_returns table - missing columns:", missingColumns.join(", "));
      
      // Create new table with complete schema
      await db.execAsync(`
        CREATE TABLE pending_returns_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_code TEXT NOT NULL DEFAULT '',
          barcode TEXT NOT NULL,
          name TEXT,
          bmrp REAL DEFAULT 0,
          cost REAL DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          eCost REAL DEFAULT 0,
          currentStock INTEGER DEFAULT 0,
          batchSupplier TEXT,
          scannedAt INTEGER,
          batch_supplier TEXT,
          product TEXT,
          brand TEXT,
          isManualEntry INTEGER DEFAULT 0,
          return_reason TEXT DEFAULT ''
        );
      `);
      
      // Build INSERT statement using only columns that exist in both tables
      const commonColumns = existingColumns.filter(col => 
        requiredColumns.includes(col) && col !== 'id'
      );
      
      if (commonColumns.length > 0) {
        const columnsList = commonColumns.join(', ');
        
        try {
          await db.execAsync(`
            INSERT INTO pending_returns_new (${columnsList})
            SELECT ${columnsList}
            FROM pending_returns
          `);
          console.log(`✅ Migrated ${commonColumns.length} columns of data`);
        } catch (copyError) {
          console.log("⚠️ Could not copy old data (table might be empty):", copyError);
        }
      }
      
      // Drop old table and rename new one
      await db.execAsync(`DROP TABLE pending_returns`);
      await db.execAsync(`ALTER TABLE pending_returns_new RENAME TO pending_returns`);
      
      console.log("✅ Successfully migrated pending_returns table");
    } else {
      console.log("✅ pending_returns table already has all required columns");
    }
    
  } catch (error) {
    console.error("❌ Error initializing pending_returns table:", error);
    // If all else fails, try to recreate the table from scratch
    try {
      console.log("🔄 Attempting to recreate table from scratch...");
      await db.execAsync(`DROP TABLE IF EXISTS pending_returns`);
      await db.execAsync(`
        CREATE TABLE pending_returns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_code TEXT NOT NULL DEFAULT '',
          barcode TEXT NOT NULL,
          name TEXT,
          bmrp REAL DEFAULT 0,
          cost REAL DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          eCost REAL DEFAULT 0,
          currentStock INTEGER DEFAULT 0,
          batchSupplier TEXT,
          scannedAt INTEGER,
          batch_supplier TEXT,
          product TEXT,
          brand TEXT,
          isManualEntry INTEGER DEFAULT 0,
          return_reason TEXT DEFAULT ''
        );
      `);
      console.log("✅ Successfully recreated pending_returns table");
    } catch (recreateError) {
      console.error("❌ Failed to recreate table:", recreateError);
    }
  }
};

const debugManualEntry = async (barcode: string) => {
  console.log("\n🔍 === DEBUGGING MANUAL RETURN ENTRY ===");
  
  try {
    const pendingItem = await db.getFirstAsync(
      `SELECT barcode, name, isManualEntry, supplier_code FROM pending_returns WHERE barcode = ?`,
      [barcode]
    ) as any;
    console.log("1️⃣ pending_returns table:", JSON.stringify(pendingItem, null, 2));
    
    const syncReturn = await db.getFirstAsync(
      `SELECT barcode, product_name, is_manual_entry, itemcode FROM returns_to_sync WHERE barcode = ? ORDER BY created_at DESC LIMIT 1`,
      [barcode]
    ) as any;
    console.log("2️⃣ returns_to_sync table:", JSON.stringify(syncReturn, null, 2));
    
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(pending_returns)`);
    console.log("3️⃣ pending_returns schema:");
    tableInfo.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type})`);
    });
  } catch (error) {
    console.error("Debug error:", error);
  }
  
  console.log("🔍 === END DEBUG ===\n");
};

export default function PurchaseReturnBarcodeEntry() {
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
    return_reason: '',
  });

  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<"hardware" | "camera">("hardware");
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
      console.log("🚀 Initializing PurchaseReturnBarcodeEntry component...");
      await initReturnsTable();
      await initPendingReturnsTable();
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
          return_reason
        FROM pending_returns 
        WHERE supplier_code = ? 
        ORDER BY scannedAt DESC`,
        [supplier_code || ""]
      );
      
      console.log(`📦 Loaded ${rows.length} pending return items for supplier: ${supplier_code}`);
      setScannedItems(rows);
    } catch (error) {
      console.error("❌ Error loading pending return items:", error);
      
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
            return_reason
          FROM pending_returns 
          ORDER BY scannedAt DESC`
        );
        console.log(`📦 Loaded ${rows.length} pending return items (no supplier filter)`);
        setScannedItems(rows);
      } catch (fallbackError) {
        console.error("❌ Fallback query also failed:", fallbackError);
        setScannedItems([]);
      }
    }
  };

  const savePendingItem = async (item: any) => {
    try {
      console.log("\n💾 === SAVING PENDING RETURN ITEM ===");
      console.log("Item data:", JSON.stringify(item, null, 2));
      
      await db.runAsync(
        `INSERT INTO pending_returns 
        (supplier_code, barcode, name, bmrp, cost, quantity, eCost, currentStock, batchSupplier, scannedAt, batch_supplier, product, brand, isManualEntry, return_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplier_code || "",
          item.barcode,
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
          item.return_reason || '',
        ]
      );
      
      const saved = await db.getFirstAsync(
        `SELECT barcode, name, isManualEntry FROM pending_returns WHERE barcode = ? ORDER BY id DESC LIMIT 1`,
        [item.barcode]
      );
      console.log("✅ Verified saved pending return item:", JSON.stringify(saved, null, 2));
      console.log("💾 === END SAVING PENDING RETURN ITEM ===\n");
      
    } catch (error) {
      console.error("Error saving pending return item:", error);
    }
  };

  const deletePendingItem = async (itemId: number) => {
    try {
      await db.runAsync(
        "DELETE FROM pending_returns WHERE id = ?",
        [itemId]
      );
      console.log(`🗑️ Deleted pending return item: ${itemId}`);
    } catch (error) {
      console.error("Error deleting pending return item:", error);
    }
  };

  const updatePendingItem = async (itemId: number, item: any) => {
    try {
      await db.runAsync(
        `UPDATE pending_returns 
        SET quantity = ?, eCost = ?, cost = ?, batchSupplier = ?, supplier_code = ?, return_reason = ?
        WHERE id = ?`,
        [item.quantity, item.eCost, item.cost, item.batchSupplier, supplier_code, item.return_reason, itemId]
      );
      console.log(`✏️ Updated pending return item: ${itemId}`);
    } catch (error) {
      console.error("Error updating pending return item:", error);
    }
  };

  useEffect(() => {
    const loadScanMode = async () => {
      const saved = await SecureStore.getItemAsync("scanMode");
      if (saved === "camera" || saved === "hardware") {
        setScanMode(saved);
      }
    };
    loadScanMode();
  }, []);

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
      if (!isEditing && searchMode === 'barcode' && scanMode === 'hardware') {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isEditing, searchMode, scanMode, showManualEntryModal, showQuantityModal]);

  useEffect(() => {
    if (showManualEntryModal || showQuantityModal) {
      return;
    }
    
    if (searchMode === 'barcode' && scanMode === 'hardware' && hardwareScanValue.length > 0 && hardwareScanValue.trim() !== "") {
      handleBarCodeScanned({ data: hardwareScanValue.trim() }, 'scanner');
      setHardwareScanValue("");
    }
  }, [hardwareScanValue, searchMode, scanMode, showManualEntryModal, showQuantityModal]);

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
    
    if (text.trim().length >= 1) {
      const searchLower = text.toLowerCase().trim();
      
      const uniqueNames = Array.from(
        new Set(
          allProducts
            .filter((product: any) => 
              product.name?.toLowerCase().startsWith(searchLower)
            )
            .map((product: any) => product.name)
            .filter((name: string) => name && name.trim() !== '')
        )
      ).sort((a, b) => a.localeCompare(b))
      .slice(0, 20);
      
      setNameSuggestions(uniqueNames);
      setShowNameSuggestions(uniqueNames.length > 0);
    } else {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
    }
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
    addProductToList(product);
  };

  const addProductToList = async (product: any) => {
    const existing = scannedItems.find((item) => item.barcode === product.barcode);
    if (existing) {
      Alert.alert("Info", `Return item already scanned: ${existing.name}`);
      return;
    }

    const currentCost = product.cost ?? product.bmrp ?? 0;
    
    const newItem = {
      ...product,
      quantity: 0,
      cost: currentCost, // Current cost from product data
      eCost: currentCost, // Set eCost same as current cost initially
      currentStock: product.quantity ?? 0,
      batchSupplier: product.batch_supplier ?? supplier,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
      return_reason: '',
    };
    
    await savePendingItem(newItem);
    await loadPendingItems();
    setManualBarcode("");
  };

  const openQuantityModal = (product: any) => {
    console.log("📦 Opening quantity modal for:", product.name);
    setSelectedProduct(product);
    setSelectedQuantity(1);
    setShowQuantityModal(true);
  };

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

  const increaseQuantity = () => {
    setSelectedQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    setSelectedQuantity(prev => prev > 1 ? prev - 1 : 1);
  };

  const addProductFromQuantityModal = async () => {
    if (!selectedProduct) return;

    const existing = scannedItems.find((item) => item.barcode === selectedProduct.barcode);
    if (existing) {
      Alert.alert("Info", `Return item already scanned: ${existing.name}`);
      closeQuantityModal();
      return;
    }

    const currentCost = selectedProduct.cost ?? selectedProduct.bmrp ?? 0;
    
    const newItem = {
      ...selectedProduct,
      quantity: selectedQuantity,
      cost: currentCost, // Current cost from product data
      eCost: currentCost, // Set eCost same as current cost initially
      currentStock: selectedProduct.quantity ?? 0,
      batchSupplier: selectedProduct.batch_supplier ?? supplier,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
      return_reason: '',
    };
    
    await savePendingItem(newItem);
    await loadPendingItems();
    
    closeQuantityModal();
    setManualBarcode("");
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
      return_reason: '',
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
      return_reason: '',
    });
    setNameSuggestions([]);
    setShowNameSuggestions(false);
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

    const existing = scannedItems.find((item) => item.barcode === manualEntryData.barcode);
    if (existing) {
      Alert.alert("Info", `Return item with this barcode already exists: ${existing.name}`);
      return;
    }

    console.log("\n🎯 === CREATING MANUAL RETURN ENTRY ===");
    console.log("Input data:", {
      barcode: manualEntryData.barcode,
      name: manualEntryData.name.trim(),
      isManualEntry: 1
    });

    const newItem = {
      barcode: manualEntryData.barcode,
      name: manualEntryData.name.trim(),
      bmrp: mrp,
      cost: cost, // Cost entered by user
      quantity: quantity,
      eCost: cost, // Set eCost same as the cost entered initially
      currentStock: quantity,
      batchSupplier: supplier,
      scannedAt: new Date().getTime(),
      batch_supplier: supplier,
      product: '',
      brand: '',
      isManualEntry: 1,
      return_reason: manualEntryData.return_reason,
    };

    console.log("💾 About to save newItem:", JSON.stringify(newItem, null, 2));
    
    await savePendingItem(newItem);
    await loadPendingItems();
    
    await debugManualEntry(manualEntryData.barcode);
    
    closeManualEntryModal();
    Alert.alert("Success", "Return item added successfully!");
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
        console.log("❌ No matches found, showing manual entry option");
        Alert.alert(
          "Product not found", 
          `Barcode: ${data}\n\nWould you like to add this return item manually?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // RESET SCANNER STATE - THIS IS CRITICAL!
                if (source === 'scanner') {
                  setScanned(false);
                  scanLockRef.current = false;
                  processingAlertRef.current = false;
                }
              }
            },
            {
              text: 'Add Manually',
              onPress: () => {
                openManualEntryModal(data);
                // RESET SCANNER STATE
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
          Alert.alert("Info", `Return item already scanned: ${existing.name}`, [
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
          
          // Reset scanner state after opening modal
          setTimeout(() => {
            setScanned(false);
            scanLockRef.current = false;
          }, 500);
        } else {
          // For manual barcode entry, add directly without modal
          const currentCost = product.cost ?? product.bmrp ?? 0;
          
          const newItem = {
            ...product,
            quantity: 0,
            cost: currentCost,
            eCost: currentCost,
            currentStock: product.quantity ?? 0,
            batchSupplier: product.batch_supplier ?? supplier,
            scannedAt: new Date().getTime(),
            isManualEntry: 0,
            return_reason: '',
          };

          await savePendingItem(newItem);
          await loadPendingItems();
          
          setManualBarcode("");
          
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
      Alert.alert("Error", "Failed to scan return item.", [
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
            `Barcode: ${trimmed}\n\nWould you like to add this return item manually?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Add Manually',
                onPress: () => openManualEntryModal(trimmed)
              }
            ]
          );
          return;
        }

        if (allMatches.length === 1) {
          const product = allMatches[0] as { [key: string]: any; quantity?: number };
          const existing = scannedItems.find((item) => item.barcode === product.barcode);
          
          if (existing) {
            Alert.alert("Info", `Return item already scanned: ${existing.name}`);
            return;
          }

          const currentCost = product.cost ?? product.bmrp ?? 0;
          
          const newItem = {
            ...product,
            quantity: 0,
            cost: currentCost, // Current cost from product data
            eCost: currentCost, // Set eCost same as current cost initially
            currentStock: product.quantity ?? 0,
            batchSupplier: product.batch_supplier ?? supplier,
            scannedAt: new Date().getTime(),
            isManualEntry: 0,
            return_reason: '',
          };

          await savePendingItem(newItem);
          await loadPendingItems();
          
          setManualBarcode("");
        } else {
          setSuggestions(allMatches);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        Alert.alert("Error", "Failed to fetch return item.");
      }
    } else {
      const searchLower = trimmed.toLowerCase();
      const matches = allProducts.filter((product: any) => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.product?.toLowerCase().includes(searchLower)
      );

      if (matches.length === 1) {
        await addProductToList(matches[0]);
      } else if (matches.length > 1) {
        setSuggestions(matches);
        setShowSuggestions(true);
      } else {
        Alert.alert("Not Found", `No return items found matching: "${trimmed}"`);
      }
    }
  };

  const handleEditItem = (item: any, index: number) => {
    router.push({
      pathname: "/purchase-return-edit-product",
      params: {
        itemData: JSON.stringify(item),
        itemIndex: index.toString(),
        supplier: supplier || "",
        supplier_code: supplier_code || "",
      },
    } as any);
  };

  const handleDeleteItem = async (index: number) => {
    Alert.alert(
      "Delete Return Item",
      "Are you sure you want to delete this return item?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const item = scannedItems[index];
            if (item.id) {
              await deletePendingItem(item.id);
            }
            await loadPendingItems();
          }
        }
      ]
    );
  };

  const handleBack = () => {
    router.back();
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

  const updateQuantities = async () => {
    if (scannedItems.length === 0) {
      Alert.alert("No items", "Please scan return items before processing.");
      return;
    }

    const itemsWithMissingData = scannedItems.filter(item => {
      const hasInvalidMrp = !item.bmrp || item.bmrp === 0 || isNaN(item.bmrp);
      const hasInvalidCost = !item.cost || item.cost === 0 || isNaN(item.cost);
      const hasInvalidQty = !item.quantity || item.quantity === 0 || isNaN(item.quantity);
      return hasInvalidMrp || hasInvalidCost || hasInvalidQty;
    });

    if (itemsWithMissingData.length > 0) {
      const itemNames = itemsWithMissingData.map(item => `• ${item.name}`).join('\n');
      
      Alert.alert(
        "⚠️ Incomplete Data Warning",
        `The following ${itemsWithMissingData.length} return item(s) have missing or zero values:\n\n${itemNames}\n\nDo you want to proceed?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Proceed Anyway", style: "destructive", onPress: () => showFinalConfirmation() }
        ]
      );
    } else {
      showFinalConfirmation();
    }
  };

  const showFinalConfirmation = () => {
    Alert.alert(
      "Confirm Return",
      `Are you sure you want to process ${scannedItems.length} return item(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Process Returns",
          style: "default",
          onPress: async () => {
            try {
              const userId = await SecureStore.getItemAsync("user_id");
              const today = new Date().toISOString().split("T")[0];

              let successCount = 0;
              let errorCount = 0;

              console.log(`\n📄 === STARTING PROCESS RETURNS ===`);
              console.log(`Processing ${scannedItems.length} return items...`);

              for (const item of scannedItems) {
                try {
                  const finalCost = item.eCost !== 0 ? item.eCost : item.cost;
                  let itemCode = item.barcode;
                  
                  const isManualEntry = item.isManualEntry === 1;
                  
                  if (!isManualEntry) {
                    const productData = await db.getFirstAsync(
                      "SELECT code FROM product_data WHERE barcode = ?",
                      [item.barcode]
                    ) as { code?: string } | null;
                    itemCode = productData?.code || item.barcode;
                  }
                  
                  console.log(`\n📋 Processing return item:`, {
                    barcode: item.barcode,
                    name: item.name,
                    isManualEntry: isManualEntry,
                    itemCode: itemCode,
                    product_name: item.name,
                    return_reason: item.return_reason
                  });
                  
                  await saveReturnToSync({
                    supplier_code: supplier_code || "",
                    userid: userId ?? "unknown",
                    itemcode: itemCode,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    rate: finalCost ?? 0,
                    mrp: item.bmrp ?? 0,
                    return_date: today,
                    product_name: item.name,
                    is_manual_entry: isManualEntry ? 1 : 0,
                    return_reason: item.return_reason || '',
                  });

                  if (!isManualEntry) {
                    const productExists = await db.getFirstAsync(
                      "SELECT 1 FROM product_data WHERE barcode = ?",
                      [item.barcode]
                    );
                    
                    if (productExists) {
                      await db.runAsync(
                        "UPDATE product_data SET quantity = ?, cost = ? WHERE barcode = ?",
                        [item.quantity, finalCost, item.barcode]
                      );
                      console.log(`✅ Updated product_data for return: ${item.barcode}`);
                    }
                  } else {
                    console.log(`⭐ Skipping product_data update for manual return entry: ${item.barcode}`);
                  }
                  
                  successCount++;
                  
                } catch (itemError) {
                  console.error(`❌ Error processing return item ${item.barcode}:`, itemError);
                  errorCount++;
                }
              }
              
              console.log(`\n📊 Results: ${successCount} success, ${errorCount} errors`);
              console.log(`📄 === END PROCESS RETURNS ===\n`);
              
              if (successCount > 0) {
                try {
                  await db.runAsync(
                    "DELETE FROM pending_returns WHERE supplier_code = ?",
                    [supplier_code || ""]
                  );
                  console.log(`🧹 Cleared ${successCount} pending return items`);
                } catch (deleteError) {
                  console.error("❌ Could not delete pending return items:", deleteError);
                }
              }

              if (errorCount === 0) {
                Alert.alert("✅ Success", `All ${successCount} return entries saved for sync!`);
                setScannedItems([]);
                router.push("/(main)/");
              } else if (successCount > 0) {
                Alert.alert("⚠️ Partial Success", 
                  `${successCount} return entries saved, ${errorCount} failed.`);
                await loadPendingItems();
              } else {
                Alert.alert("❌ Error", "Failed to save any return entries.");
              }
            } catch (err) {
              console.error("💥 Save failed:", err);
              Alert.alert("Error", "Failed to save return entries.");
            }
          }
        }
      ]
    );
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
            <Text style={styles.detailChipLabel}>Stock:</Text>
            <Text style={styles.detailChipValue}>{Math.abs(item.quantity || 0)}</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>MRP:</Text>
            <Text style={styles.detailChipValue}>₹{item.bmrp || 0}</Text>
          </View>
          {item.barcode && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipValue} numberOfLines={1}>{item.barcode}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999999" />
    </TouchableOpacity>
  );

  const getCardStyle = (item: any, index: number) => {
    if (item.isManualEntry === 1) {
      return styles.manualEntryCard;
    }
    return index === 0 ? styles.latestProductCard : styles.regularProductCard;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.backButton}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#dc2626" />
        </TouchableOpacity>
      </View>

      {/* Quantity Selection Modal */}
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
                  Cost: ₹{selectedProduct.cost ?? selectedProduct.bmrp ?? 0} per unit
                </Text>

                <View style={styles.quantityControlContainer}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={decreaseQuantity}
                  >
                    <Ionicons name="remove" size={24} color="#b01111" />
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
                    <Ionicons name="add" size={24} color="#b01111" />
                  </TouchableOpacity>
                </View>

                <View style={styles.quantityTotalContainer}>
                  <Text style={styles.quantityTotalLabel}>Total Return:</Text>
                  <Text style={styles.quantityTotalValue}>
                    ₹{((selectedProduct.cost ?? selectedProduct.bmrp ?? 0) * selectedQuantity).toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.quantityAddButton}
                  onPress={addProductFromQuantityModal}
                >
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.quantityAddButtonText}>Add to Return List</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showManualEntryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeManualEntryModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Return Item Manually</Text>
              <TouchableOpacity 
                onPress={closeManualEntryModal}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Barcode *</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputDisabled]}
                  value={manualEntryData.barcode}
                  editable={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Item Name *</Text>
                <View style={styles.autocompleteContainer}>
                  <TextInput
                    style={styles.formInput}
                    value={manualEntryData.name}
                    onChangeText={handleNameInputChange}
                    placeholder="Enter or select product name"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    returnKeyType="next"
                    autoFocus={true}
                    onFocus={() => setIsEditing(true)}
                    onBlur={() => {
                      setIsEditing(false);
                      setTimeout(() => setShowNameSuggestions(false), 200);
                    }}
                  />
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <ScrollView 
                      style={styles.autocompleteSuggestionsWrapper}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {nameSuggestions.map((name, index) => (
                        <TouchableOpacity
                          key={`${name}-${index}`}
                          style={styles.autocompleteSuggestionItem}
                          onPress={() => handleSelectNameSuggestion(name)}
                        >
                          <Text style={styles.autocompleteSuggestionText} numberOfLines={1}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Return Reason (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualEntryData.return_reason}
                  onChangeText={(text) => setManualEntryData({...manualEntryData, return_reason: text})}
                  placeholder="Enter reason for return"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>MRP (₹) *</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualEntryData.mrp}
                  onChangeText={(text) => setManualEntryData({...manualEntryData, mrp: text})}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cost (₹) *</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualEntryData.cost}
                  onChangeText={(text) => setManualEntryData({...manualEntryData, cost: text})}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Quantity *</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualEntryData.quantity}
                  onChangeText={(text) => setManualEntryData({...manualEntryData, quantity: text})}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={closeManualEntryModal}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveManualEntry}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>
                  Save Return Item
                </Text>
              </TouchableOpacity>
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

      {searchMode === 'barcode' && scanMode === 'hardware' && !showManualEntryModal && !showQuantityModal && (
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
          Supplier (Return): {supplier} ({supplier_code})
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
            keyboardDismissMode="on-drag"
            contentContainerStyle={{paddingBottom: 20}}
          />
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>
                Return Items ({scannedItems.length})
              </Text>

              {scannedItems.length === 0 && (
                <Text style={styles.emptyText}>
                  No return items scanned yet. Start scanning or enter a {searchMode === 'barcode' ? 'barcode' : 'product name'} manually.
                </Text>
              )}

              {scannedItems.map((item, index) => (
                <View
                  key={`${item.barcode}-${index}-${item.scannedAt}`}
                  style={[
                    styles.productCard,
                    getCardStyle(item, index)
                  ]}
                >
                  <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                      {item.isManualEntry === 1 && (
                        <View style={styles.manualEntryBadge}>
                          <Text style={styles.manualEntryBadgeText}>MANUAL RETURN</Text>
                        </View>
                      )}
                      <Text style={styles.productName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.productBarcode}>{item.barcode}</Text>
                      {item.return_reason && (
                        <Text style={{fontSize: 12, color: '#dc2626', marginTop: 4}}>
                          Reason: {item.return_reason}
                        </Text>
                      )}
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
                        <Ionicons name="create-outline" size={22} color="white" />
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
                        Return Qty: <Text style={styles.eQtyText}>{item.quantity}</Text>
                      </Text>
                      <Text style={styles.detailText}>
                        Return Cost: <Text style={styles.eCostText}>₹{item.eCost || 0}</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Powered by IMC Business Solutions
                </Text>
              </View>
            </View>
          </ScrollView>

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
                name={scanMode === "camera" ? "hardware-chip" : "camera"}
                size={24}
                color="white"
              />
              <Text style={styles.bottomButtonText}>
                {scanMode === "hardware" ? "Camera" : "Camera"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}