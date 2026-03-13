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
  TouchableWithoutFeedback,
  View
} from "react-native";
import Toast from "react-native-toast-message";
import SalesCartDrawer from "./SalesCartDrawer";
const db = SQLite.openDatabaseSync("magicpedia.db");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
 backButton: {
  backgroundColor: '#1E293B',
  borderRadius: 20,
  padding: 8,
},
  header: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: 16,
    backgroundColor: '#f2f4f8',
    paddingBottom: 6,
    paddingTop: Platform.OS === 'android' ? 55 : 60,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  hiddenInput: {
    height: 1,
    width: 1,
    opacity: 0,
    position: 'absolute',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#131f3d',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f6ffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbcfd4',
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f5',
  },
  toggleButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: '#b7c1ce',
  },
  toggleButtonActive: {
    backgroundColor: '#131f3d',
  },
  toggleIcon: {
    marginRight: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d3d6db',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 5,
    backgroundColor: '#f1f2f4',
    fontSize: 16,
    color: '#F8FAFC',
  },
  getButton: {
    backgroundColor: '#131f3d',
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
    borderColor: '#E2E8F0',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionContent: {
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
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
    backgroundColor: '#EFF6FF',
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
    color: '#0F172A',
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
    color: '#131f3d',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
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
    padding: 18,
  },
  latestProductCard: {
    backgroundColor: '#d6f3f5',
    borderWidth: 1,
    borderColor: '#d7d7da',
  },
  regularProductCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manualEntryCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  manualEntryBadge: {
    backgroundColor: '#0ea5e9',
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
    color: '#0F172A',
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 0,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-end',
  },
  editButton: {
    backgroundColor: '#131f3d',
    padding: 10,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#ef4466',
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
    color: '#475569',
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
    color: '#2563eb',
  },
  eQtyText: {
    fontWeight: '600',
    color: '#10B981',
  },
  eCostText: {
    fontWeight: '600',
    color: '#059669',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    backgroundColor: '#131f3d',
  },
  scannerButtonInactive: {
    backgroundColor: '#94A3B8',
  },
  updateButton: {
    backgroundColor: '#43b1d6',
  },
  updateButtonInactive: {
    backgroundColor: '#d1d5db',
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
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
    borderColor: '#10B981',
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#131f3d',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  formInputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  autocompleteContainer: {
    position: 'relative',
  },
  autocompleteSuggestionsWrapper: {
    maxHeight: 200,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autocompleteSuggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  autocompleteSuggestionText: {
    fontSize: 14,
    color: '#374151',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#F8FAFC',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  modalButtonSave: {
    backgroundColor: '#131f3d',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#ffffff',
  },
  modalButtonTextSave: {
    color: '#ffffff',
  },
  variantsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#131f3d',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#0F172A',
    flex: 1,
  },
  quantityModalCloseButton: {
    padding: 4,
  },
  quantityProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  quantityPriceText: {
    fontSize: 14,
    color: '#64748B',
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F172A',
    minWidth: 60,
    textAlign: 'center',
  },
  quantityTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  quantityTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  quantityTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  quantityAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131f3d',
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
  headerTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
headerIcons: {
  flexDirection: 'row',
  gap: 8,
},
headerIconBtn: {
  width: 48,
  height: 40,
  borderRadius: 10,
  backgroundColor: '#cfd5e5',
  alignItems: 'center',
  justifyContent: 'center',
},
headerIconDot: {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#10B981',
},
cartBadge: {
  position: 'absolute',
  top: 4,
  right: 4,
  backgroundColor: '#EF4444',
  borderRadius: 8,
  minWidth: 16,
  height: 16,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 3,
},
cartBadgeText: {
  color: '#fff',
  fontSize: 9,
  fontWeight: '700',
},
customerModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',   // ← change from 'flex-end' to 'center'
  alignItems: 'center',
  paddingHorizontal: 20,
},
customerModalContent: {
  backgroundColor: '#fff',
  borderRadius: 16,   // all corners, not just top
  padding: 20,
  width: '100%',
},
cartModalContent: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
  paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  maxHeight: '80%',
},
customerModalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
},
customerModalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#0F172A',
},
customerInput: {
  borderWidth: 1.5,
  borderColor: '#131f3d',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: '#0F172A',
  marginBottom: 16,
},
customerSaveBtn: {
  backgroundColor: '#131f3d',
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center',
},
customerSaveBtnText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 16,
},
cartCustomerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#ECFDF5',
  padding: 10,
  borderRadius: 10,
  marginBottom: 14,
},
cartCustomerText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#059669',
},
cartItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},
cartItemName: {
  fontSize: 14,
  fontWeight: '600',
  color: '#0F172A',
},
cartItemDetail: {
  fontSize: 12,
  color: '#64748B',
  marginTop: 2,
},
cartItemTotal: {
  fontSize: 15,
  fontWeight: '700',
  color: '#131f3d',
},
cartTotalRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 16,
  paddingTop: 14,
  borderTopWidth: 2,
  borderTopColor: '#131f3d',
},
cartTotalLabel: {
  fontSize: 16,
  fontWeight: '700',
  color: '#0F172A',
},
cartTotalValue: {
  fontSize: 20,
  fontWeight: '800',
  color: '#131f3d',
},
cartEmptyText: {
  textAlign: 'center',
  color: '#94A3B8',
  fontSize: 15,
  paddingVertical: 30,
},
});

// ─── DB TABLES ───────────────────────────────────────────────────────────────



const initPendingSalesItemsTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_sales_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT,
        bmrp REAL,
        cost REAL,
        quantity INTEGER,
        eCost REAL,
        currentStock INTEGER,
        scannedAt INTEGER,
        product TEXT,
        brand TEXT,
        isManualEntry INTEGER DEFAULT 0
      );
    `);

    const tableInfo: any[] = await db.getAllAsync(`PRAGMA table_info(pending_sales_items)`);
    const hasIsManualEntry = tableInfo.some((col: any) => col.name === 'isManualEntry');

    if (!hasIsManualEntry) {
      await db.execAsync(`ALTER TABLE pending_sales_items RENAME TO pending_sales_items_old;`);
      await db.execAsync(`
        CREATE TABLE pending_sales_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          barcode TEXT NOT NULL,
          name TEXT NOT NULL,
          code TEXT,
          bmrp REAL,
          cost REAL,
          quantity INTEGER,
          eCost REAL,
          currentStock INTEGER,
          scannedAt INTEGER,
          product TEXT,
          brand TEXT,
          isManualEntry INTEGER DEFAULT 0
        );
      `);
      await db.execAsync(`
        INSERT INTO pending_sales_items
        (id, barcode, name, bmrp, cost, quantity, eCost, currentStock, scannedAt, product, brand, isManualEntry)
        SELECT id, barcode, name, bmrp, cost, quantity, eCost, currentStock, scannedAt, product, brand, 0
        FROM pending_sales_items_old;
      `);
      await db.execAsync(`DROP TABLE IF EXISTS pending_sales_items_old;`);
    }

    const hasCodeColumn = tableInfo.some((col: any) => col.name === 'code');
    if (!hasCodeColumn) {
      await db.execAsync(`ALTER TABLE pending_sales_items ADD COLUMN code TEXT;`);
    }

  } catch (error: any) {
    console.error("❌ Error in initPendingSalesItemsTable:", error);
    if (error.message?.includes('no such table') || error.message?.includes('no such column')) {
      try {
        await db.execAsync(`DROP TABLE IF EXISTS pending_sales_items;`);
        await db.execAsync(`
          CREATE TABLE pending_sales_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode TEXT NOT NULL,
            name TEXT NOT NULL,
            code TEXT,
            bmrp REAL,
            cost REAL,
            quantity INTEGER,
            eCost REAL,
            currentStock INTEGER,
            scannedAt INTEGER,
            product TEXT,
            brand TEXT,
            isManualEntry INTEGER DEFAULT 0
          );
        `);
      } catch (recreateError) {
        console.error("❌ Failed to recreate table:", recreateError);
      }
    }
  }
};

const saveSalesOrderToSync = async (orderData: {
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  sales_date: string;
  product_name?: string;
  is_manual_entry?: number;
}) => {
  try {
    await db.runAsync(
      `INSERT INTO sales_to_sync
      (userid, itemcode, barcode, quantity, rate, mrp, sales_date, sync_status, created_at, product_name, is_manual_entry)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), ?, ?)`,
      [
        orderData.userid,
        orderData.itemcode,
        orderData.barcode,
        orderData.quantity,
        orderData.rate,
        orderData.mrp,
        orderData.sales_date,
        orderData.product_name || '',
        orderData.is_manual_entry || 0
      ]
    );
  } catch (error) {
    console.error("❌ Error saving to sales_to_sync:", error);
    throw error;
  }
};

const savePendingSalesItem = async (item: any) => {
  try {
    await db.runAsync(
      `INSERT INTO pending_sales_items
(barcode, name, code, bmrp, cost, quantity, eCost, currentStock, scannedAt, product, brand, isManualEntry)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.barcode,
        item.name,
        item.code || '',
        item.bmrp || 0,
        item.cost || 0,
        item.quantity || 0,
        item.eCost || 0,
        item.currentStock || 0,
        item.scannedAt || Date.now(),
        item.product || '',
        item.brand || '',
        item.isManualEntry || 0
      ]
    );
  } catch (error) {
    console.error("Error saving pending sales item:", error);
    throw error;
  }
};

const deletePendingSalesItem = async (id: number) => {
  try {
    await db.runAsync(`DELETE FROM pending_sales_items WHERE id = ?`, [id]);
  } catch (error) {
    console.error("Error deleting pending sales item:", error);
    throw error;
  }
};

const debugSalesSave = async (barcode: string) => {
  try {
    const saved = await db.getFirstAsync(
      "SELECT * FROM pending_sales_items WHERE barcode = ? ORDER BY scannedAt DESC LIMIT 1",
      [barcode]
    ) as any;
    console.log("🔍 DEBUG - Saved sales item:", {
      barcode: saved?.barcode,
      name: saved?.name,
      isManualEntry: saved?.isManualEntry,
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function SalesBarcodeEntry() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [searchMode, setSearchMode] = useState<'barcode' | 'name'>('barcode');
  const [manualBarcode, setManualBarcode] = useState('');
  const [hardwareScanValue, setHardwareScanValue] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const inputRef = useRef<TextInput>(null);
  const scanLockRef = useRef(false);
  const processingAlertRef = useRef(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');   // ← ADD HERE
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  // Manual Entry Modal States
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    barcode: '',
    name: '',
    mrp: '',
    cost: '',
    quantity: '',
  });
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Quantity Modal States
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Auto-reset stuck scanner
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      if (scanned && scanLockRef.current && showScanner) {
        setScanned(false);
        scanLockRef.current = false;
        processingAlertRef.current = false;
      }
    }, 5000);
    return () => clearTimeout(resetTimer);
  }, [scanned, showScanner]);

  useEffect(() => {
    const initialize = async () => {
      await initPendingSalesItemsTable();
      await loadPendingSalesItems();
      await loadAllProducts();
    };
    initialize();
  }, []);

  useEffect(() => {
    if (searchMode === 'barcode' && !showManualEntryModal && !showQuantityModal) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchMode, showManualEntryModal, showQuantityModal]);

  useEffect(() => {
    if (hardwareScanValue && hardwareScanValue.trim()) {
      const trimmed = hardwareScanValue.trim();
      setHardwareScanValue('');
      handleBarCodeScanned({ data: trimmed }, 'scanner');
    }
  }, [hardwareScanValue]);

  useEffect(() => {
    if (params.updatedItem && params.itemIndex !== undefined) {
      const updatedItem = JSON.parse(params.updatedItem as string);
      const item = scannedItems[parseInt(params.itemIndex as string)];
      if (item?.id) {
        db.runAsync(
          `UPDATE pending_sales_items
           SET quantity = ?, eCost = ?, cost = ?, bmrp = ?
           WHERE id = ?`,
          [updatedItem.quantity, updatedItem.eCost, updatedItem.cost, updatedItem.bmrp, item.id]
        ).then(() => loadPendingSalesItems());
      }
      router.setParams({ updatedItem: undefined, itemIndex: undefined });
    }
  }, [params.updatedItem, params.itemIndex]);

  const loadAllProducts = async () => {
    try {
      const products: any[] = await db.getAllAsync(
        "SELECT * FROM product_data ORDER BY name ASC"
      );
      setAllProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadPendingSalesItems = async () => {
    try {
      const items: any[] = await db.getAllAsync(
        `SELECT * FROM pending_sales_items ORDER BY scannedAt DESC`
      );
      setScannedItems(items);
    } catch (error) {
      console.error("Error loading pending sales items:", error);
    }
  };

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
            .filter((product: any) => product.name?.toLowerCase().startsWith(searchLower))
            .map((product: any) => product.name)
            .filter((name: string) => name && name.trim() !== '')
        )
      ).sort((a, b) => a.localeCompare(b)).slice(0, 20);
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
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();
    addProductDirectly(product);
  };

  const openQuantityModal = (product: any) => {
    setSelectedProduct(product);
    setSelectedQuantity(1);
    setShowQuantityModal(true);
  };

  const closeQuantityModal = () => {
    setShowQuantityModal(false);
    setSelectedProduct(null);
    setSelectedQuantity(1);
    setTimeout(() => {
      setScanned(false);
      scanLockRef.current = false;
      processingAlertRef.current = false;
    }, 300);
  };

  const increaseQuantity = () => setSelectedQuantity(prev => prev + 1);
  const decreaseQuantity = () => setSelectedQuantity(prev => prev > 1 ? prev - 1 : 1);

  const addProductFromQuantityModal = async () => {
    if (!selectedProduct) return;
    const existing = scannedItems.find((item) => item.barcode === selectedProduct.barcode);
    if (existing) {
      Alert.alert("Info", `Product already scanned: ${existing.name}`);
      closeQuantityModal();
      return;
    }
    const currentCost = selectedProduct.cost ?? selectedProduct.bmrp ?? 0;
    const newItem = {
      ...selectedProduct,
      quantity: selectedQuantity,
      cost: currentCost,
      eCost: currentCost,
      currentStock: selectedProduct.quantity ?? 0,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
    };
    await savePendingSalesItem(newItem);
    await loadPendingSalesItems();
    closeQuantityModal();
    setManualBarcode("");
  };

  const addProductDirectly = async (product: any) => {
    const existing = scannedItems.find((item) => item.barcode === product.barcode);
    if (existing) {
      Alert.alert("Info", `Product already scanned: ${existing.name}`);
      return;
    }
    const currentCost = product.cost ?? product.bmrp ?? 0;
    const newItem = {
      ...product,
      quantity: 0,
      cost: currentCost,
      eCost: currentCost,
      currentStock: product.quantity ?? 0,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
    };
    await savePendingSalesItem(newItem);
    await loadPendingSalesItems();
    setManualBarcode("");
  };

  const addProductToList = async (product: any) => {
    addProductDirectly(product);
  };

  const searchBarcodeWithVariants = async (barcode: string) => {
    try {
      const exactRows = await db.getAllAsync("SELECT * FROM product_data WHERE barcode = ?", [barcode]);
      const variantRows1 = await db.getAllAsync("SELECT * FROM product_data WHERE barcode LIKE ?", [`${barcode} :%`]);
      const variantRows2 = await db.getAllAsync("SELECT * FROM product_data WHERE barcode LIKE ?", [`${barcode}:%`]);
      return [...exactRows, ...variantRows1, ...variantRows2];
    } catch (err) {
      console.error("Error searching barcode:", err);
      throw err;
    }
  };

  const openManualEntryModal = (barcode: string) => {
    setManualEntryData({ barcode, name: '', mrp: '', cost: '', quantity: '' });
    setShowManualEntryModal(true);
    setNameSuggestions([]);
    setShowNameSuggestions(false);
  };

  const closeManualEntryModal = () => {
    setShowManualEntryModal(false);
    setManualEntryData({ barcode: '', name: '', mrp: '', cost: '', quantity: '' });
    setNameSuggestions([]);
    setShowNameSuggestions(false);
  };

  const handleSaveManualEntry = async () => {
    const { barcode, name, mrp, cost, quantity } = manualEntryData;
    if (!name.trim()) { Alert.alert("Error", "Product name is required"); return; }
    const parsedMrp = parseFloat(mrp) || 0;
    const parsedCost = parseFloat(cost) || 0;
    const parsedQuantity = parseInt(quantity) || 0;
    if (parsedMrp <= 0) { Alert.alert("Error", "Please enter a valid MRP"); return; }
    if (parsedCost <= 0) { Alert.alert("Error", "Please enter a valid cost"); return; }
    if (parsedQuantity <= 0) { Alert.alert("Error", "Please enter a valid quantity"); return; }

    try {
      const existingProduct = await db.getFirstAsync(
        "SELECT * FROM product_data WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
        [name.trim()]
      ) as any;

      let newItem;
      if (existingProduct) {
        newItem = {
          barcode,
          name: existingProduct.name,
          bmrp: existingProduct.bmrp || parsedMrp,
          cost: existingProduct.cost || parsedCost,
          quantity: parsedQuantity,
          eCost: existingProduct.cost || parsedCost,
          currentStock: existingProduct.quantity || 0,
          scannedAt: new Date().getTime(),
          product: existingProduct.product || '',
          brand: existingProduct.brand || '',
          code: existingProduct.code,
          isManualEntry: 0,
        };
      } else {
        newItem = {
          barcode,
          name: name.trim(),
          bmrp: parsedMrp,
          cost: parsedCost,
          quantity: parsedQuantity,
          eCost: parsedCost,
          currentStock: parsedQuantity,
          scannedAt: new Date().getTime(),
          product: '',
          brand: '',
          isManualEntry: 1,
        };
      }

      await savePendingSalesItem(newItem);
      await loadPendingSalesItems();
      await debugSalesSave(barcode);
      closeManualEntryModal();

      if (existingProduct) {
        Alert.alert("Success", `Linked barcode "${barcode}" to existing product:\n"${existingProduct.name}"`);
      } else {
        Alert.alert("Success", "New product added!");
      }
    } catch (error) {
      console.error("❌ Error in handleSaveManualEntry:", error);
      Alert.alert("Error", "Failed to save product");
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }, source: 'scanner' | 'manual' = 'scanner') => {
    if (source === 'scanner') {
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      setScanned(true);
      if (showScanner) setShowScanner(false);
    }

    try {
      const allMatches = await searchBarcodeWithVariants(data);

      if (allMatches.length === 0) {
        Alert.alert(
          "Product not found",
          `Barcode: ${data}\n\nWould you like to add this product manually?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {
              if (source === 'scanner') { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; }
            }},
            { text: 'Add Manually', onPress: () => {
              openManualEntryModal(data);
              if (source === 'scanner') { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; }
            }}
          ]
        );
        return;
      }

      if (allMatches.length === 1) {
        const product = allMatches[0] as { [key: string]: any; quantity?: number };
        const existing = scannedItems.find((item) => item.barcode === product.barcode);
        if (existing) {
          Alert.alert("Info", `Product already scanned: ${existing.name}`, [
            { text: 'OK', onPress: () => {
              if (source === 'scanner') { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; }
            }}
          ]);
          return;
        }
        if (source === 'scanner') {
          openQuantityModal(product);
        } else {
          addProductDirectly(product);
          if (source === 'scanner') {
            setTimeout(() => { setScanned(false); scanLockRef.current = false; }, 500);
          }
        }
      } else {
        setSuggestions(allMatches);
        setShowSuggestions(true);
        if (source === 'scanner') {
          setTimeout(() => { setScanned(false); scanLockRef.current = false; }, 500);
        }
      }
    } catch (err) {
      console.error("❌ Error fetching product:", err);
      Alert.alert("Error", "Failed to scan product.", [
        { text: 'OK', onPress: () => {
          if (source === 'scanner') { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; }
        }}
      ]);
    }
  };

  const handleManualSearch = async () => {
    const trimmed = manualBarcode.trim();
    if (!trimmed) { Alert.alert("Error", "Please enter a search term"); return; }

    if (searchMode === 'barcode') {
      try {
        const allMatches = await searchBarcodeWithVariants(trimmed);
        if (allMatches.length === 0) {
          Alert.alert("Product not found", `Barcode: ${trimmed}\n\nWould you like to add this product manually?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Add Manually', onPress: () => openManualEntryModal(trimmed) }
            ]
          );
          return;
        }
        if (allMatches.length === 1) {
          const product = allMatches[0];
          const existing = scannedItems.find((item) => item.barcode === product.barcode);
          if (existing) { Alert.alert("Info", `Product already scanned: ${existing.name}`); return; }
          addProductDirectly(product);
        } else {
          setSuggestions(allMatches);
          setShowSuggestions(true);
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch product.");
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
        Alert.alert("Not Found", `No products found matching: "${trimmed}"`);
      }
    }
  };

  const handleEditItem = (item: any, index: number) => {
    router.push({
      pathname: "/sales-editproduct",
      params: {
        itemData: JSON.stringify(item),
        itemIndex: index.toString(),
      },
    } as any);
  };

  const handleDeleteItem = async (index: number) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          const item = scannedItems[index];
          if (item.id) await deletePendingSalesItem(item.id);
          await loadPendingSalesItems();
        }}
      ]
    );
  };

 const handleAddAllToCart = async () => {
  const userId = await SecureStore.getItemAsync("user_id") || "";
  const today = new Date().toISOString().split("T")[0];

  const enrichedItems = scannedItems.map(item => ({
    ...item,
    userid: userId,
    supplier_code: "",           // sales has no supplier, leave empty or use a default
    itemcode: item.code || item.barcode,  // item.code exists (line 829/950 in table/save)
    sale_date: today,
  }));

  setCartItems(prev => [...prev, ...enrichedItems]);
  await db.runAsync(`DELETE FROM pending_sales_items`);
  await loadPendingSalesItems();
  setShowCartModal(true);
};

  const handleRemoveFromCart = async (index: number) => {
  const item = scannedItems[index];
  if (item?.id) await deletePendingSalesItem(item.id);
  await loadPendingSalesItems();
};

  const handleToggleScanner = async () => {
    setScanned(false);
    scanLockRef.current = false;
    processingAlertRef.current = false;
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Camera Permission", "Camera access is required to scan barcodes.");
        return;
      }
    }
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setTimeout(() => {
      setScanned(false);
      scanLockRef.current = false;
      processingAlertRef.current = false;
    }, 300);
  };

  const updateQuantities = async () => {
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
        `The following ${itemsWithMissingData.length} item(s) have missing or zero values:\n\n${itemNames}\n\nDo you want to proceed?`,
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
      "Confirm Upload",
      `Are you sure you want to upload sales data for ${scannedItems.length} item(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upload",
          style: "default",
          onPress: async () => {
            try {
              const userId = await SecureStore.getItemAsync("user_id");
              const today = new Date().toISOString().split("T")[0];
              let successCount = 0;
              let errorCount = 0;

              for (const item of scannedItems) {
                try {
                  const finalCost = item.eCost !== 0 ? item.eCost : item.cost;
                  let itemCode = item.barcode;
                  const isManualEntry = item.isManualEntry === 1;

                  if (!isManualEntry) {
                    if (item.code) {
                      itemCode = item.code;
                    } else {
                      const productData = await db.getFirstAsync(
                        "SELECT code FROM product_data WHERE barcode = ?",
                        [item.barcode]
                      ) as { code?: string } | null;
                      itemCode = productData?.code || item.barcode;
                    }
                  }

                  await saveSalesOrderToSync({
                    userid: userId ?? "unknown",
                    itemcode: itemCode,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    rate: finalCost ?? 0,
                    mrp: item.bmrp ?? 0,
                    sales_date: today,
                    product_name: item.name,
                    is_manual_entry: isManualEntry ? 1 : 0,
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
                    }
                  }
                  successCount++;
                } catch (itemError) {
                  console.error(`❌ Error processing sales item ${item.barcode}:`, itemError);
                  errorCount++;
                }
              }

              await db.runAsync(`DELETE FROM pending_sales_items`);
              await loadPendingSalesItems();
              Alert.alert(
                "Success",
                `Sales data uploaded!\n✅ ${successCount} successful${errorCount > 0 ? `\n❌ ${errorCount} failed` : ''}`
              );
              router.back();
            } catch (error) {
              console.error("Error uploading sales data:", error);
              Alert.alert("Error", "Failed to upload sales data");
            }
          },
        },
      ]
    );
  };

  const getCardStyle = (item: any, index: number) => {
    if (item.isManualEntry === 1) return styles.manualEntryCard;
    return index === 0 ? styles.latestProductCard : styles.regularProductCard;
  };

  const renderSuggestionItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.suggestionDetailsContainer}>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Barcode:</Text>
            <Text style={styles.detailChipValue}>{item.barcode}</Text>
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

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      

      {/* ── Quantity Modal ── */}
      <Modal visible={showQuantityModal} transparent animationType="fade" onRequestClose={closeQuantityModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.quantityModalOverlay}>
            <View style={styles.quantityModalContent}>
              {selectedProduct && (
                <>
                  <View style={styles.quantityModalHeader}>
                    <Text style={styles.quantityModalTitle}>Select Quantity</Text>
                    <TouchableOpacity onPress={closeQuantityModal} style={styles.quantityModalCloseButton}>
                      <Ionicons name="close-circle" size={28} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.quantityProductName} numberOfLines={2}>{selectedProduct.name}</Text>
                  <Text style={styles.quantityPriceText}>
                    Price: ₹{selectedProduct.cost ?? selectedProduct.bmrp ?? 0} per unit
                  </Text>
                  <View style={styles.quantityControlContainer}>
                    <TouchableOpacity style={styles.quantityButton} onPress={decreaseQuantity}>
                      <Ionicons name="remove" size={24} color="#10B981" />
                    </TouchableOpacity>
                    <TextInput
                      value={selectedQuantity.toString()}
                      onChangeText={(text) => { const num = parseInt(text) || 0; if (num >= 0) setSelectedQuantity(num); }}
                      keyboardType="numeric"
                      style={styles.quantityValue}
                      selectTextOnFocus={true}
                    />
                    <TouchableOpacity style={styles.quantityButton} onPress={increaseQuantity}>
                      <Ionicons name="add" size={24} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quantityTotalContainer}>
                    <Text style={styles.quantityTotalLabel}>Total:</Text>
                    <Text style={styles.quantityTotalValue}>
                      ₹{((selectedProduct.cost ?? selectedProduct.bmrp ?? 0) * selectedQuantity).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.quantityAddButton} onPress={addProductFromQuantityModal}>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.quantityAddButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Manual Entry Modal ── */}
      <Modal visible={showManualEntryModal} animationType="slide" transparent={false} onRequestClose={closeManualEntryModal} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay} keyboardVerticalOffset={0}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product Manually</Text>
              <TouchableOpacity onPress={closeManualEntryModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={true}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Barcode *</Text>
                <TextInput style={[styles.formInput, styles.formInputDisabled]} value={manualEntryData.barcode} editable={false} />
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
                    onBlur={() => { setIsEditing(false); setTimeout(() => setShowNameSuggestions(false), 200); }}
                  />
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <ScrollView style={styles.autocompleteSuggestionsWrapper} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                      {nameSuggestions.map((name, index) => (
                        <TouchableOpacity key={`${name}-${index}`} style={styles.autocompleteSuggestionItem} onPress={() => handleSelectNameSuggestion(name)}>
                          <Text style={styles.autocompleteSuggestionText} numberOfLines={1}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>MRP (₹) *</Text>
                <TextInput style={styles.formInput} value={manualEntryData.mrp} onChangeText={(text) => setManualEntryData({...manualEntryData, mrp: text})} placeholder="0.00" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" returnKeyType="next" onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cost (₹) *</Text>
                <TextInput style={styles.formInput} value={manualEntryData.cost} onChangeText={(text) => setManualEntryData({...manualEntryData, cost: text})} placeholder="0.00" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" returnKeyType="next" onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Quantity *</Text>
                <TextInput style={styles.formInput} value={manualEntryData.quantity} onChangeText={(text) => setManualEntryData({...manualEntryData, quantity: text})} placeholder="0" placeholderTextColor="#9ca3af" keyboardType="number-pad" returnKeyType="done" onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)} />
              </View>
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={closeManualEntryModal}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleSaveManualEntry}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Camera Scanner Modal ── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={handleCloseScanner}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : (data) => { handleBarCodeScanned(data, 'scanner'); }}
            barcodeScannerSettings={{
              barcodeTypes: ["qr","ean13","ean8","code128","code39","upc_a","upc_e","code93","itf14"],
            }}
          >
            <View style={styles.scannerOverlay}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseScanner}>
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
      {/* ── Customer Modal ── */}
<Modal
  visible={showCustomerModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowCustomerModal(false)}
>
  <TouchableWithoutFeedback onPress={() => setShowCustomerModal(false)}>
    <View style={styles.customerModalOverlay}>
      <TouchableWithoutFeedback onPress={() => {}}>
        <View style={styles.customerModalContent}>
          <View style={styles.customerModalHeader}>
            <Text style={styles.customerModalTitle}>Add Customer</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.customerInput}
            placeholder="Customer name"
            placeholderTextColor="#94A3B8"
            value={customerName}
            onChangeText={setCustomerName}
          />

          <TextInput
            style={styles.customerInput}
            placeholder="Phone number"
            placeholderTextColor="#94A3B8"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />

        <TouchableOpacity
          style={styles.customerSaveBtn}
          onPress={() => {
            if (!customerName.trim()) {
              Alert.alert('Required', 'Please enter a customer name');
              return;
            }
            setShowCustomerModal(false);
            Toast.show({
              type: 'success',
              text1: 'Customer Added',
              text2: customerName.trim(),
            });
          }}
        >
          <Text style={styles.customerSaveBtnText}>Save</Text>
        </TouchableOpacity>

        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

      {/* Hidden hardware scanner input */}
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
 {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>SALES ENTRY</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => setShowCustomerModal(true)} style={styles.headerIconBtn}>
              <Ionicons name="person-add-outline" size={20} color="#131f3d" />
              {customerName ? <View style={styles.headerIconDot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCartModal(true)} style={styles.headerIconBtn}>
              <Ionicons name="cart-outline" size={22} color="#131f3d" />
             {cartItems.length > 0 && (
                <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                </View>
                )}
            </TouchableOpacity>
          </View>
        </View>

    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, styles.toggleButtonLeft, searchMode === 'barcode' ? styles.toggleButtonActive : null]}
        onPress={() => searchMode !== 'barcode' && toggleSearchMode()}
      >
        <Ionicons name="barcode-outline" size={18} color={searchMode === 'barcode' ? '#FFFFFF' : '#828d9d'} style={styles.toggleIcon} />
        <Text style={[styles.toggleText, searchMode === 'barcode' ? styles.toggleTextActive : null]}>Barcode Search</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, searchMode === 'name' ? styles.toggleButtonActive : null]}
        onPress={() => searchMode !== 'name' && toggleSearchMode()}
      >
        <Ionicons name="search" size={18} color={searchMode === 'name' ? '#FFFFFF' : '#828d9d'} style={styles.toggleIcon} />
        <Text style={[styles.toggleText, searchMode === 'name' ? styles.toggleTextActive : null]}>Item Search</Text>
      </TouchableOpacity>
    </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder={searchMode === 'barcode' ? 'Enter barcode manually' : 'Search by name...'}
            placeholderTextColor="#626f80"
            value={manualBarcode}
            onChangeText={handleSearchTextChange}
            style={styles.textInput}
            keyboardType="default"
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
          />
          <TouchableOpacity onPress={handleManualSearch} style={styles.getButton}>
            <Text style={styles.getButtonText}>Get</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Suggestions or Product List ── */}
      {showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          {searchMode === 'barcode' && suggestions.length > 1 && (
            <Text style={styles.variantsHeader}>Found {suggestions.length} variants - Select one:</Text>
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
              <Text style={styles.sectionTitle}>Scanned Products ({scannedItems.length})</Text>

              {scannedItems.length === 0 && (
              <Text style={styles.emptyText}>
                {`No products scanned yet. Start scanning or enter a ${searchMode === 'barcode' ? 'barcode' : 'product name'} manually.`}
              </Text>
            )}

              {scannedItems.map((item, index) => (
                <View key={`${item.barcode}-${index}-${item.scannedAt}`} style={[styles.productCard, getCardStyle(item, index)]}>
                  <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                      {item.isManualEntry === 1 && (
                        <View style={styles.manualEntryBadge}>
                          <Text style={styles.manualEntryBadgeText}>MANUAL ENTRY</Text>
                        </View>
                      )}
                      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.productBarcode}>{item.barcode}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity onPress={() => handleDeleteItem(index)} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={20} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEditItem(item, index)} style={styles.editButton}>
                        <Ionicons name="create-outline" size={22} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.productDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailText}>MRP: <Text style={styles.mrpText}>₹{item.bmrp || 0}</Text></Text>
                      <Text style={styles.detailText}>Cost: <Text style={styles.costText}>₹{item.cost || 0}</Text></Text>
                      <Text style={styles.detailText}>Stock: <Text style={styles.stockText}>{item.currentStock}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailText}>E.Qty: <Text style={styles.eQtyText}>{item.quantity}</Text></Text>
                      <Text style={styles.detailText}>E.Cost: <Text style={styles.eCostText}>₹{(item.eCost || item.cost || 0).toFixed(3)}</Text></Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by IMC Business Solutions</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
                style={[styles.bottomButton, scannedItems.length > 0 ? styles.updateButton : styles.updateButtonInactive]}
                disabled={scannedItems.length === 0}
                onPress={handleAddAllToCart}                >
                <Ionicons name="cart-outline" size={24} color="white" />
                <Text style={styles.bottomButtonText}>Add Cart ({scannedItems.length})</Text>
                </TouchableOpacity>
            <TouchableOpacity style={[styles.bottomButton, styles.scannerButton]} onPress={handleToggleScanner}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.bottomButtonText}>Camera</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
     <SalesCartDrawer
      visible={showCartModal}
      items={cartItems}
      customerName={customerName}
      customerPhone={customerPhone}
      onClose={() => setShowCartModal(false)}
      onRemoveItem={(index) => setCartItems(prev => prev.filter((_, i) => i !== index))}
      onUploadSuccess={async () => {
        setCartItems([]);
        await db.runAsync(`DELETE FROM pending_sales_items`);
        await loadPendingSalesItems();
      }}  
        />  
    </KeyboardAvoidingView>
    );
};



   