import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
    color: '#ec4899',
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
    backgroundColor: '#ec4899',
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
    backgroundColor: '#ec4899',
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
    backgroundColor: '#fce7f3',
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
  productHeaderManual: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: -32,
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
    marginBottom: 0,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-end',
  },
  editButton: {
    backgroundColor: '#ec4899',
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
    color: '#9333ea',
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
    color: '#ea580c',
  },
  eCostText: {
    fontWeight: '600',
    color: '#059669',
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
    borderTopColor: '#e5e7eb',
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
    backgroundColor: '#ec4899',
  },
  scannerButtonInactive: {
    backgroundColor: '#fbcfe8',
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
    borderColor: '#ec4899',
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
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#da218a',
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
    backgroundColor: '#fdfcfd',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f26666',
    borderWidth: 2,
    borderColor: '#f9f8f8',
  },
  modalButtonSave: {
    backgroundColor: '#cf387e',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#fdfcfd',
  },
  modalButtonTextSave: {
    color: '#fffeff',
  },
  variantsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ec4899',
    padding: 12,
    backgroundColor: '#fce7f3',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    backgroundColor: '#fce7f3',
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
    color: '#ec4899',
  },
  quantityAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
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

const initGRNTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grn_to_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL DEFAULT '',
        userid TEXT NOT NULL DEFAULT '',
        itemcode TEXT NOT NULL DEFAULT '',
        barcode TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 0,
        rate REAL NOT NULL DEFAULT 0,
        mrp REAL NOT NULL DEFAULT 0,
        grn_date TEXT NOT NULL DEFAULT '',
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        product_name TEXT,
        is_manual_entry INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        text1 TEXT DEFAULT ''
      );
    `);

    // Safely patch any missing columns on existing installs
    const tableInfo: any[] = await db.getAllAsync(`PRAGMA table_info(grn_to_sync)`);
    const cols = tableInfo.map((col: any) => col.name);

    const migrations = [
      { col: 'supplier_code',   def: `ALTER TABLE grn_to_sync ADD COLUMN supplier_code TEXT NOT NULL DEFAULT ''` },
      { col: 'userid',          def: `ALTER TABLE grn_to_sync ADD COLUMN userid TEXT NOT NULL DEFAULT ''` },
      { col: 'itemcode',        def: `ALTER TABLE grn_to_sync ADD COLUMN itemcode TEXT NOT NULL DEFAULT ''` },
      { col: 'barcode',         def: `ALTER TABLE grn_to_sync ADD COLUMN barcode TEXT NOT NULL DEFAULT ''` },
      { col: 'product_name',    def: `ALTER TABLE grn_to_sync ADD COLUMN product_name TEXT DEFAULT ''` },
      { col: 'is_manual_entry', def: `ALTER TABLE grn_to_sync ADD COLUMN is_manual_entry INTEGER DEFAULT 0` },
      { col: 'description',     def: `ALTER TABLE grn_to_sync ADD COLUMN description TEXT DEFAULT ''` },
      { col: 'text1',           def: `ALTER TABLE grn_to_sync ADD COLUMN text1 TEXT DEFAULT ''` },
    ];

    for (const m of migrations) {
      if (!cols.includes(m.col)) {
        console.log(`⚠️ Adding missing column to grn_to_sync: ${m.col}`);
        try {
          await db.execAsync(m.def);
        } catch (e) {
          console.warn(`Could not add column ${m.col}:`, e);
        }
      }
    }

    console.log("✅ grn_to_sync table ready");
  } catch (error) {
    console.error("Error initializing grn_to_sync table:", error);
  }
};

const initPendingGRNItemsTable = async () => {
  try {
   await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_grn_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT,
        barcode TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT, 
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

    const tableInfo: any[] = await db.getAllAsync(`PRAGMA table_info(pending_grn_items)`);
    const hasIsManualEntry = tableInfo.some((col: any) => col.name === 'isManualEntry');
    
    if (!hasIsManualEntry) {
      console.log("⚠️ Adding isManualEntry column to pending_grn_items...");
      await db.execAsync(`ALTER TABLE pending_grn_items RENAME TO pending_grn_items_old;`);
      await db.execAsync(`
        CREATE TABLE pending_grn_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_code TEXT,
          barcode TEXT NOT NULL,
          name TEXT NOT NULL,
          code TEXT,
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
          isManualEntry INTEGER DEFAULT 0
        );
      `);
      await db.execAsync(`
        INSERT INTO pending_grn_items 
        (id, supplier_code, barcode, name, bmrp, cost, quantity, eCost, currentStock, batchSupplier, scannedAt, batch_supplier, product, brand, isManualEntry)
        SELECT 
          id, supplier_code, barcode, name, bmrp, cost, quantity, eCost, currentStock, batchSupplier, scannedAt, batch_supplier, product, brand, 0
        FROM pending_grn_items_old;
      `);
      await db.execAsync(`DROP TABLE IF EXISTS pending_grn_items_old;`);
      console.log("✅ Successfully added isManualEntry column to pending_grn_items");
    }



    const hasCodeColumn = tableInfo.some((col: any) => col.name === 'code');
    if (!hasCodeColumn) {
      console.log("⚠️ Adding 'code' column to pending_grn_items...");
      await db.execAsync(`ALTER TABLE pending_grn_items ADD COLUMN code TEXT;`);
      console.log("✅ 'code' column added");
    }
    const hasMoreoption = tableInfo.some((col: any) => col.name === 'moreoption');
    if (!hasMoreoption) {
      await db.execAsync(`ALTER TABLE pending_grn_items ADD COLUMN moreoption TEXT DEFAULT ''`);
      console.log("✅ 'moreoption' column added to pending_grn_items");
    }
    const hasText1 = tableInfo.some((col: any) => col.name === 'text1');
    if (!hasText1) {
      await db.execAsync(`ALTER TABLE pending_grn_items ADD COLUMN text1 TEXT DEFAULT ''`);
      console.log("✅ 'text1' column added to pending_grn_items");
    }


  } catch (error: any) {
    console.error("❌ Error in initPendingGRNItemsTable:", error);
    
    if (error.message?.includes('no such table') || error.message?.includes('no such column')) {
      console.log("🔧 Creating fresh pending_grn_items table...");
      try {
        await db.execAsync(`DROP TABLE IF EXISTS pending_grn_items;`);
        await db.execAsync(`
          CREATE TABLE pending_grn_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_code TEXT,
            barcode TEXT NOT NULL,
            name TEXT NOT NULL,
            code TEXT,
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
            isManualEntry INTEGER DEFAULT 0
          );
        `);
        console.log("✅ Successfully recreated pending_grn_items table");
      } catch (recreateError) {
        console.error("❌ Failed to recreate table:", recreateError);
      }
    }
  }
};

const debugManualGRNEntry = async (barcode: string) => {
  console.log("\n🔍 === DEBUGGING MANUAL GRN ENTRY ===");
  
  try {
    const pendingItem = await db.getFirstAsync(
      `SELECT barcode, name, isManualEntry, supplier_code FROM pending_grn_items WHERE barcode = ?`,
      [barcode]
    ) as any;
    console.log("1️⃣ pending_grn_items table:", JSON.stringify(pendingItem, null, 2));
    
    const syncOrder = await db.getFirstAsync(
      `SELECT barcode, product_name, is_manual_entry, itemcode FROM grn_to_sync WHERE barcode = ? ORDER BY created_at DESC LIMIT 1`,
      [barcode]
    ) as any;
    console.log("2️⃣ grn_to_sync table:", JSON.stringify(syncOrder, null, 2));
    
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(pending_grn_items)`);
    console.log("3️⃣ pending_grn_items schema:");
    tableInfo.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type})`);
    });
  } catch (error) {
    console.error("Debug error:", error);
  }
  
  console.log("🔍 === END DEBUG ===\n");
};

const saveGRNOrderToSync = async (orderData: {
  supplier_code: string;
  userid: string;
  itemcode: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  grn_date: string;
  product_name?: string;
  is_manual_entry?: number;
  description?: string;
   text1?: string;
}) => {
  try {
    console.log("\n💾 === SAVING GRN ORDER TO SYNC ===");
    console.log("📋 Input orderData:", JSON.stringify(orderData, null, 2));
    
   await db.runAsync(
      `INSERT INTO grn_to_sync 
      (supplier_code, userid, itemcode, barcode, quantity, rate, mrp, grn_date, sync_status, created_at, product_name, is_manual_entry, description, text1)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), ?, ?, ?, ?)`,
      [
        orderData.supplier_code,
        orderData.userid,
        orderData.itemcode,
        orderData.barcode,
        orderData.quantity,
        orderData.rate,
        orderData.mrp,
        orderData.grn_date,
        orderData.product_name || '',
        orderData.is_manual_entry || 0,
        orderData.description || '',
        orderData.text1 || '',
      ]
    );
    
    const savedOrder = await db.getFirstAsync(
      `SELECT * FROM grn_to_sync WHERE barcode = ? ORDER BY created_at DESC LIMIT 1`,
      [orderData.barcode]
    );
    console.log("✅ Saved to grn_to_sync:", JSON.stringify(savedOrder, null, 2));
  } catch (error) {
    console.error("❌ Error saving to grn_to_sync:", error);
    throw error;
  }
};

const savePendingGRNItem = async (item: any) => {
  try {
   await db.runAsync(
      `INSERT INTO pending_grn_items 
(supplier_code, barcode, name, code, bmrp, cost, quantity, eCost, currentStock, batchSupplier, scannedAt, batch_supplier, product, brand, isManualEntry, moreoption, text1)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.supplier_code || '',
        item.barcode,
        item.name,
        item.code || '',
        item.bmrp || 0,
        item.cost || 0,
        item.quantity || 0,
        item.eCost || 0,
        item.currentStock || 0,
        item.batchSupplier || '',
        item.scannedAt || Date.now(),
        item.batch_supplier || '',
        item.product || '',
        item.brand || '',
        item.isManualEntry || 0,
        item.moreoption || '',
        item.text1 || ''
      ]
    );
  } catch (error) {
    console.error("Error saving pending GRN item:", error);
    throw error;
  }
};

const deletePendingGRNItem = async (id: number) => {
  try {
    await db.runAsync(`DELETE FROM pending_grn_items WHERE id = ?`, [id]);
  } catch (error) {
    console.error("Error deleting pending GRN item:", error);
    throw error;
  }
};

// 👇 ADD THIS DEBUG FUNCTION HERE
const debugGRNSave = async (barcode: string) => {
  try {
    const saved = await db.getFirstAsync(
      "SELECT * FROM pending_grn_items WHERE barcode = ? ORDER BY scannedAt DESC LIMIT 1",
      [barcode]
    ) as any;
    
    console.log("🔍 DEBUG - Saved GRN item:", {
      barcode: saved?.barcode,
      name: saved?.name,
      isManualEntry: saved?.isManualEntry,
      supplier_code: saved?.supplier_code
    });
    
    const syncItem = await db.getFirstAsync(
      "SELECT * FROM grn_to_sync WHERE barcode = ? ORDER BY created_at DESC LIMIT 1",
      [barcode]
    ) as any;
    
    console.log("🔍 DEBUG - Saved in grn_to_sync:", {
      barcode: syncItem?.barcode,
      product_name: syncItem?.product_name,
      is_manual_entry: syncItem?.is_manual_entry,
      itemcode: syncItem?.itemcode
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
};

export default function GRNBarcodeEntry() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { supplier, supplier_code } = params as { supplier: string; supplier_code: string };
  
  const [searchMode, setSearchMode] = useState<'barcode' | 'name'>('barcode');
  const [manualBarcode, setManualBarcode] = useState('');
  const [hardwareScanValue, setHardwareScanValue] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const inputRef = useRef<TextInput>(null);
  const scanLockRef = useRef(false);
  const processingAlertRef = useRef(false);
  
  // Manual Entry Modal States
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    barcode: '',
    name: '',
    mrp: '',
    cost: '',
    quantity: '',
    size: '',
  });
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Quantity Modal States
  const [isLoading, setIsLoading] = useState(true);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

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
      await initGRNTable();
      await initPendingGRNItemsTable();
      await loadPendingGRNItems();
      setIsLoading(false);
      await new Promise(resolve => setTimeout(resolve, 800));

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

 const MIN_BARCODE_LENGTH = 4; // ignore stray keypresses shorter than this
const SCAN_DEBOUNCE_MS = 500; // increased: Mosambe scanner needs more time between chars

useEffect(() => {
  if (!hardwareScanValue) return;

  const debounceTimer = setTimeout(() => {
    const trimmed = hardwareScanValue.trim();

    // Guard: ignore partial/stray input shorter than minimum barcode length
    if (trimmed && trimmed.length >= MIN_BARCODE_LENGTH) {
      console.log(`📟 Hardware scan detected: "${trimmed}"`);
      setHardwareScanValue('');
      handleBarCodeScanned({ data: trimmed }, 'scanner');
    } else if (trimmed) {
      // Partial scan received — clear and wait for next full scan
      console.warn(`⚠️ Partial scan ignored (${trimmed.length} chars): "${trimmed}"`);
      setHardwareScanValue('');
    }
  }, SCAN_DEBOUNCE_MS);

  return () => clearTimeout(debounceTimer);
}, [hardwareScanValue]);

  useEffect(() => {
    if (params.updatedItem && params.itemIndex !== undefined) {
      const updatedItem = JSON.parse(params.updatedItem as string);
      const item = scannedItems[parseInt(params.itemIndex as string)];

      if (item?.id) {
        db.runAsync(
          `UPDATE pending_grn_items 
           SET quantity = ?, eCost = ?, cost = ?, bmrp = ?, batchSupplier = ? 
           WHERE id = ?`,
          [updatedItem.quantity, updatedItem.eCost, updatedItem.cost, updatedItem.bmrp, updatedItem.batchSupplier, item.id]
        ).then(() => loadPendingGRNItems());
      }

      router.setParams({ updatedItem: undefined, itemIndex: undefined });
    }
  }, [params.updatedItem, params.itemIndex]);



  const loadPendingGRNItems = async () => {
    try {
      const items: any[] = await db.getAllAsync(
        `SELECT * FROM pending_grn_items WHERE supplier_code = ? ORDER BY scannedAt DESC`,
        [supplier_code || '']
      );
      setScannedItems(items);
    } catch (error) {
      console.error("Error loading pending GRN items:", error);
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

 const handleSearchTextChange = async (text: string) => {
  setManualBarcode(text);
  
  if (searchMode === 'name' && text.trim().length >= 2) {
    try {
      const results: any[] = await db.getAllAsync(
        `SELECT * FROM product_data 
         WHERE name LIKE ? OR brand LIKE ? OR product LIKE ? 
         ORDER BY name ASC LIMIT 50`,
        [`%${text}%`, `%${text}%`, `%${text}%`]
      );
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  } else {
    setSuggestions([]);
    setShowSuggestions(false);
  }
};

  const handleNameInputChange = async (text: string) => {
  setManualEntryData({...manualEntryData, name: text});
  
  if (text.trim().length >= 1) {
    try {
      const results: any[] = await db.getAllAsync(
        `SELECT DISTINCT name FROM product_data 
         WHERE name LIKE ? 
         ORDER BY name ASC LIMIT 20`,
        [`${text}%`]
      );
      const names = results
        .map((r: any) => r.name)
        .filter((n: string) => n && n.trim() !== '');
      setNameSuggestions(names);
      setShowNameSuggestions(names.length > 0);
    } catch (error) {
      console.error("Name search error:", error);
      setNameSuggestions([]);
      setShowNameSuggestions(false);
    }
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
  openQuantityModal(product);
  setManualBarcode("");
};

  // Function to open quantity modal
  const openQuantityModal = (product: any) => {
    console.log("📦 Opening quantity modal for:", product.name);
    setSelectedProduct(product);
    setSelectedQuantity(1);
    setShowQuantityModal(true);
  };

  // Function to close quantity modal
 const closeQuantityModal = () => {
  console.log("🔒 Closing quantity modal");
  setShowQuantityModal(false);
  setSelectedProduct(null);
  setSelectedQuantity(1);
  
  // Reset immediately — no delay, so next scan is never blocked
  setScanned(false);
  scanLockRef.current = false;
  processingAlertRef.current = false;
  console.log("🔄 Scanner state reset from quantity modal");
};

  // Function to handle quantity increase
  const increaseQuantity = () => {
    setSelectedQuantity(prev => prev + 1);
  };

  // Function to handle quantity decrease
  const decreaseQuantity = () => {
    setSelectedQuantity(prev => prev > 1 ? prev - 1 : 1);
  };

  // Function to add product from quantity modal
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
      supplier_code: supplier_code || '',
      quantity: selectedQuantity,
      cost: currentCost, // Current cost from product data
      eCost: currentCost, // Set eCost same as current cost initially
      currentStock: selectedProduct.quantity ?? 0,
      batchSupplier: selectedProduct.batch_supplier ?? supplier,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
    };
    
    await savePendingGRNItem(newItem);
    await loadPendingGRNItems();
    
    closeQuantityModal();
    setManualBarcode("");
  };

  // Function to add product directly without quantity modal (for manual search and item search)
  const addProductDirectly = async (product: any) => {
    const existing = scannedItems.find((item) => item.barcode === product.barcode);
    if (existing) {
      Alert.alert("Info", `Product already scanned: ${existing.name}`);
      return;
    }

    const currentCost = product.cost ?? product.bmrp ?? 0;
    
    const newItem = {
      ...product,
      supplier_code: supplier_code || '',
      quantity: 0, // Default quantity is 0 for GRN
      cost: currentCost, // Current cost from product data
      eCost: currentCost, // Set eCost same as current cost initially
      currentStock: product.quantity ?? 0,
      batchSupplier: product.batch_supplier ?? supplier,
      scannedAt: new Date().getTime(),
      isManualEntry: 0,
    };
    
    await savePendingGRNItem(newItem);
    await loadPendingGRNItems();
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
    });
    setNameSuggestions([]);
    setShowNameSuggestions(false);
  };
const handleSaveManualEntry = async () => {
  const { barcode, name, mrp, cost, quantity } = manualEntryData;

  if (!name.trim()) {
    Alert.alert("Error", "Product name is required");
    return;
  }

  const parsedMrp = parseFloat(mrp) || 0;
  const parsedCost = parseFloat(cost) || 0;
  const parsedQuantity = parseInt(quantity) || 0;

  if (parsedMrp <= 0) {
    Alert.alert("Error", "Please enter a valid MRP");
    return;
  }

  if (parsedCost <= 0) {
    Alert.alert("Error", "Please enter a valid cost");
    return;
  }

  if (parsedQuantity <= 0) {
    Alert.alert("Error", "Please enter a valid quantity");
    return;
  }

  try {
    // 🔍 Search for existing product by name (case-insensitive)
    const existingProduct = await db.getFirstAsync(
      "SELECT * FROM product_data WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
      [name.trim()]
    ) as any;

    let newItem;
    
    if (existingProduct) {
      // ✅ EXISTING PRODUCT - Use ioflag = 0
      console.log("✅ Found existing product:", existingProduct.name);
      console.log("🔗 Linking barcode:", barcode, "to existing product");
      
      newItem = {
        supplier_code: supplier_code || '',
        barcode: barcode,
        name: existingProduct.name,
        bmrp: parsedMrp,
        cost: parsedCost,
        quantity: parsedQuantity,
        eCost: parsedCost,
        currentStock: existingProduct.quantity || 0,
        batchSupplier: existingProduct.batch_supplier || supplier,
        scannedAt: new Date().getTime(),
        batch_supplier: existingProduct.batch_supplier || supplier,
        product: existingProduct.product || '',
        brand: existingProduct.brand || '',
        code: existingProduct.code,
        moreoption: manualEntryData.size?.trim() || '',
        isManualEntry: 2, // 🎯 CRITICAL: Set to 2 for existing products (ioflag will be -101)
      };
      
      console.log("✅ Created item with isManualEntry = 2 (ioflag will be -101)");
    } else {
      // 🆕 NEW PRODUCT - Use ioflag = -100
      console.log("🆕 New product - will be manual entry");
      
      newItem = {
        supplier_code: supplier_code || '',
        barcode: barcode,
        name: name.trim(),
        bmrp: parsedMrp,
        cost: parsedCost,
        quantity: parsedQuantity,
        eCost: parsedCost,
        currentStock: parsedQuantity,
        batchSupplier: supplier,
        scannedAt: new Date().getTime(),
        batch_supplier: supplier,
        product: '',
        brand: '',
         moreoption: manualEntryData.size?.trim() || '',
        isManualEntry: 1, // 🎯 CRITICAL: Set to 1 for new products
      };
      
      console.log("✅ Created item with isManualEntry = 1 (ioflag will be -100)");
    }

    console.log("💾 Saving item with isManualEntry:", newItem.isManualEntry);
    
    await savePendingGRNItem(newItem);
    await loadPendingGRNItems();
    await debugGRNSave(barcode);
    
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
          `Barcode: ${data}\n\nWould you like to add this product manually?`,
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
        
      // Open quantity modal for both camera and hardware scanner
      openQuantityModal(product);
       setTimeout(() => {
        setScanned(false);
        scanLockRef.current = false;
        processingAlertRef.current = false;
      }, 300);
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
            `Barcode: ${trimmed}\n\nWould you like to add this product manually?`,
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
        console.error("Error fetching product:", err);
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
      pathname: "/edit-grn-product",
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
      "Delete Item",
      "Are you sure you want to delete this item?",
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
              await deletePendingGRNItem(item.id);
            }
            await loadPendingGRNItems();
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
      "Confirm Update",
      `Are you sure you want to update GRN quantities for ${scannedItems.length} item(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          style: "default",
          onPress: async () => {
            try {
              const userId = await SecureStore.getItemAsync("user_id");
              const today = new Date().toISOString().split("T")[0];
              const deviceId = await AsyncStorage.getItem('deviceId') || await AsyncStorage.getItem('device_hardware_id') || '';


              let successCount = 0;
              let errorCount = 0;

              console.log(`\n📄 === STARTING UPDATE GRN QUANTITIES ===`);
              console.log(`Processing ${scannedItems.length} GRN items...`);

              for (const item of scannedItems) {
                try {
                  const finalCost = item.eCost !== 0 ? item.eCost : item.cost;
                  
               const isManualEntry = item.isManualEntry === 1 || item.isManualEntry === 2;

                    let itemCode: string;

                    if (isManualEntry) {
                      itemCode = item.barcode;
                    } else {
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
                  
                  console.log(`\n📋 Processing GRN item:`, {
                    barcode: item.barcode,
                    name: item.name,
                    isManualEntry: isManualEntry,
                    itemCode: itemCode,
                    product_name: item.name
                  });
                  
                  await saveGRNOrderToSync({
                    supplier_code: supplier_code || "",
                    userid: userId ?? "unknown",
                    itemcode: itemCode,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    rate: finalCost ?? 0,
                    mrp: item.bmrp ?? 0,
                    grn_date: today,
                    product_name: item.name,
                    is_manual_entry: item.isManualEntry ?? 0,
                    description: deviceId,
                    text1: item.text1 || item.moreoption || '',
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
                      console.log(`✅ Updated product_data for GRN: ${item.barcode}`);
                    }
                  } else {
                    console.log(`⭐ Skipping product_data update for GRN manual entry: ${item.barcode}`);
                  }
                  
                  successCount++;
                  
                } catch (itemError) {
                  console.error(`❌ Error processing GRN item ${item.barcode}:`, itemError);
                  errorCount++;
                }
              }
              
              console.log(`\n📊 GRN Results: ${successCount} success, ${errorCount} errors`);
              
              await db.runAsync(`DELETE FROM pending_grn_items WHERE supplier_code = ?`, [supplier_code || '']);
              
              await loadPendingGRNItems();
              
              Alert.alert(
  "✅ Data Saved Locally",
  `All ${successCount} entries saved successfully!\n\nDo you want to upload to the server now?`,
  [
    {
      text: "No",
      style: "cancel",
      
    },
    {
      text: "Yes, Upload Now",
      onPress: () => router.push("/(main)/grn-upload"),
    },
  ]
);
            } catch (error) {
              console.error("Error updating GRN quantities:", error);
              Alert.alert("Error", "Failed to update GRN quantities");
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



  return (
  <View style={{ flex: 1 }}>
    {isLoading && (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', zIndex: 999, elevation: 999, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={{ marginTop: 10, color: '#9ca3af', fontSize: 14 }}>Loading...</Text>
      </View>
    )}
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#3b82f6" />
      </TouchableOpacity>

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
                    <Ionicons name="remove" size={24} color="#ec4899" />
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
                    <Ionicons name="add" size={24} color="#ec4899" />
                  </TouchableOpacity>
                </View>

                <View style={styles.quantityTotalContainer}>
                  <Text style={styles.quantityTotalLabel}>Total:</Text>
                  <Text style={styles.quantityTotalValue}>
                    ₹{((selectedProduct.cost ?? selectedProduct.bmrp ?? 0) * selectedQuantity).toFixed(2)}
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
              <Text style={styles.modalTitle}>Add Product Manually</Text>
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
               <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Size (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualEntryData.size}
                  onChangeText={(text) => setManualEntryData({...manualEntryData, size: text})}
                  placeholder="e.g. 500ml, L, XL, 1kg"
                  placeholderTextColor="#9ca3af"
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
                  Save
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

    {searchMode === 'barcode' && !showManualEntryModal && (
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
            keyboardDismissMode="on-drag"
            contentContainerStyle={{paddingBottom: 20}}
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
                            {item.barcode}{item.moreoption ? `  |  Size: ${item.moreoption}` : ''}
                          </Text>
                        )}
                        {item.isManualEntry === 1 && item.barcode?.startsWith('MANUAL-') && item.moreoption ? (
                          <Text style={styles.productBarcode}>Size: {item.moreoption}</Text>
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
                          E.Qty: <Text style={styles.eQtyText}>{item.quantity}</Text>
                        </Text>
                        <Text style={styles.detailText}>
                          E.Cost: <Text style={styles.eCostText}>₹{(item.eCost || item.cost || 0).toFixed(3)}</Text>
                        </Text>
                        <Text style={styles.detailText}>
                          Size: <Text style={styles.eQtyText}>{item.text1 || 'null'}</Text>
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
                getItemLayout={undefined}
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
  </View>
  );
};