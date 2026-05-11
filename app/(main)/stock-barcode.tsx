import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// ─── DB ───────────────────────────────────────────────────────────────────────
const db = SQLite.openDatabaseSync("magicpedia.db");

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  primary:   "#0891B2",   // cyan-600
  primaryLt: "#ECFEFF",   // cyan-50
  accent:    "#06B6D4",   // cyan-500
  bg:        "#F8FAFC",   // slate-50
  white:     "#FFFFFF",
  border:    "#E2E8F0",
  text:      "#0F172A",
  textSub:   "#64748B",
  textMuted: "#94A3B8",
  success:   "#16A34A",
  danger:    "#DC2626",
  dangerLt:  "#FEF2F2",
  dangerBdr: "#FCA5A5",
  warning:   "#F59E0B",
  warningLt: "#FFFBEB",
  warningBdr:"#FCD34D",
};

// ─── DB init helpers (unchanged logic) ───────────────────────────────────────
const initOrdersTable = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS orders_to_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid TEXT NOT NULL, itemcode TEXT NOT NULL, barcode TEXT NOT NULL,
      quantity INTEGER NOT NULL, rate REAL NOT NULL, mrp REAL NOT NULL,
      order_date TEXT NOT NULL, sync_status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL, product_name TEXT, is_manual_entry INTEGER DEFAULT 0
    );
  `);
  try {
    const cols = await db.getAllAsync(`PRAGMA table_info(orders_to_sync)`) as Array<{ name: string }>;
    if (cols.some(c => c.name === "supplier_code")) {
      await db.execAsync(`DROP TABLE IF EXISTS orders_to_sync_new;`);
      await db.execAsync(`
        CREATE TABLE orders_to_sync_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userid TEXT NOT NULL, itemcode TEXT NOT NULL, barcode TEXT NOT NULL,
          quantity INTEGER NOT NULL, rate REAL NOT NULL, mrp REAL NOT NULL,
          order_date TEXT NOT NULL, sync_status TEXT DEFAULT 'pending',
          created_at TEXT NOT NULL, product_name TEXT, is_manual_entry INTEGER DEFAULT 0
        );
      `);
      await db.execAsync(`
        INSERT INTO orders_to_sync_new (userid,itemcode,barcode,quantity,rate,mrp,order_date,sync_status,created_at,product_name,is_manual_entry)
        SELECT userid,itemcode,barcode,quantity,rate,mrp,order_date,sync_status,created_at,product_name,is_manual_entry FROM orders_to_sync;
      `);
      await db.execAsync(`DROP TABLE orders_to_sync;`);
      await db.execAsync(`ALTER TABLE orders_to_sync_new RENAME TO orders_to_sync;`);
    }
  } catch (_) {}
};

const PENDING_SCHEMA = `
  CREATE TABLE pending_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    isManualEntry INTEGER DEFAULT 0
  );
`;

const PENDING_REQUIRED = [
  "id","barcode","name","bmrp","cost","quantity","eCost",
  "currentStock","batchSupplier","scannedAt","batch_supplier",
  "product","brand","isManualEntry",
];

const initPendingItemsTable = async () => {
  try {
    const tableExists = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pending_items'"
    ) as any;

    if (!tableExists) {
      await db.execAsync(PENDING_SCHEMA);
      return;
    }

    const tableInfo = await db.getAllAsync(
      `PRAGMA table_info(pending_items)`
    ) as Array<{ name: string }>;
    const existing = tableInfo.map((c: any) => c.name);

    // If the old table has supplier_code (NOT NULL) or is missing required cols → rebuild
    const hasSupplierCode = existing.includes("supplier_code");
    const missingCols = PENDING_REQUIRED.filter(c => !existing.includes(c));

    if (hasSupplierCode || missingCols.length > 0) {
      // Copy only columns that exist in both old and new schema
      const safeCols = existing.filter(
        c => PENDING_REQUIRED.includes(c) && c !== "id"
      );

      await db.execAsync(`DROP TABLE IF EXISTS pending_items_new;`);
      await db.execAsync(PENDING_SCHEMA.replace("pending_items", "pending_items_new"));

      if (safeCols.length > 0) {
        try {
          const cols = safeCols.join(",");
          await db.execAsync(
            `INSERT INTO pending_items_new (${cols}) SELECT ${cols} FROM pending_items;`
          );
        } catch (_) {
          // table may be empty — ignore
        }
      }

      await db.execAsync(`DROP TABLE pending_items;`);
      await db.execAsync(`ALTER TABLE pending_items_new RENAME TO pending_items;`);
    }
  } catch (error) {
    // Last resort — drop and recreate
    try {
      await db.execAsync(`DROP TABLE IF EXISTS pending_items;`);
      await db.execAsync(PENDING_SCHEMA);
    } catch (_) {}
  }
};

const saveOrderToSync = async (orderData: {
  userid: string; itemcode: string; barcode: string; quantity: number;
  rate: number; mrp: number; order_date: string; product_name?: string; is_manual_entry?: number;
}) => {
  await db.runAsync(
    `INSERT INTO stock_count_to_sync (userid,itemcode,barcode,quantity,rate,mrp,count_date,sync_status,created_at,product_name)
     VALUES (?,?,?,?,?,?,?,'pending',datetime('now'),?)`,
    [orderData.userid, orderData.itemcode, orderData.barcode, orderData.quantity,
     orderData.rate, orderData.mrp, orderData.order_date,
     orderData.product_name || ""]
  );
};

// ─── QtyInput (unchanged logic) ───────────────────────────────────────────────
function QtyInput({ value, onChange, onEditingChange, onRefocusHidden }: {
  value: number; onChange: (n: number) => void;
  onEditingChange: (v: boolean) => void; onRefocusHidden: () => void;
}) {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => { setText(String(value)); }, [value]);

  return (
    <TextInput
      style={s.qtyInput}
      value={text}
      keyboardType="decimal-pad"
      inputMode="decimal"
      onChangeText={(val) => {
        const clean = val.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
        setText(clean);
        const num = parseFloat(clean);
        if (!isNaN(num) && num >= 0) onChange(num);
      }}
      onBlur={() => {
        onEditingChange(false);
        const num = parseFloat(text);
        const safe = isNaN(num) || num <= 0 ? 1 : num;
        setText(String(safe));
        onChange(safe);
        onRefocusHidden();
      }}
      onFocus={() => { onEditingChange(true); setText(text === "0" ? "" : text); }}
      cursorColor={C.primary}
      selectTextOnFocus
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StockBarcodeEntry() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [hardwareScanValue, setHardwareScanValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [searchMode, setSearchMode] = useState<"barcode" | "name">("barcode");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({ barcode: "", name: "", mrp: "", cost: "", quantity: "" });
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
   const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  React.useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scanLockRef = useRef(false);
  const processingAlertRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const isDBReady = useRef(false);
  const isEditingRef = useRef(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await initOrdersTable();
      await initPendingItemsTable();
      await loadPendingItems();
      const saved = await SecureStore.getItemAsync("duplicatePrompt");
      isDBReady.current = true;
    };
    init();
  }, []);

  // ── Hardware scanner debounce ─────────────────────────────────────────────
  useEffect(() => {
    if (!hardwareScanValue?.trim()) return;
    if (isEditingRef.current) { setHardwareScanValue(""); return; }
    const t = setTimeout(() => {
      const trimmed = hardwareScanValue.trim();
      if (isEditingRef.current || trimmed.length < 4 || !isDBReady.current) {
        setHardwareScanValue(""); return;
      }
      setManualBarcode(trimmed);
      setHardwareScanValue("");
      handleBarCodeScanned({ data: trimmed }, "scanner");
      setTimeout(() => setManualBarcode(""), 500);
    }, 600);
    return () => clearTimeout(t);
  }, [hardwareScanValue]);

  // ── Auto-focus hidden input ───────────────────────────────────────────────
  useEffect(() => {
    if (searchMode === "barcode" && !showManualEntryModal && !showScanner && !isEditing && !manualBarcode.length) {
      const t = setTimeout(() => { if (!isEditing) inputRef.current?.focus(); }, 100);
      return () => clearTimeout(t);
    }
  }, [searchMode, showManualEntryModal, showScanner]);

  // ── Stuck scanner watchdog ────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (scanned && scanLockRef.current && showScanner) {
        setScanned(false); scanLockRef.current = false; processingAlertRef.current = false;
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [scanned, showScanner]);

  // ── Param update (edit-product return) ───────────────────────────────────
  useEffect(() => {
    if (params.updatedItem && params.itemIndex !== undefined) {
      const updated = JSON.parse(params.updatedItem as string);
      const item = scannedItems[parseInt(params.itemIndex as string)];
      if (item?.id) {
        db.runAsync(
          `UPDATE pending_items SET quantity=?,eCost=?,cost=?,bmrp=?,batchSupplier=? WHERE id=?`,
          [updated.quantity, updated.eCost, updated.cost, updated.bmrp, updated.batchSupplier, item.id]
        ).then(() => loadPendingItems());
      }
      router.setParams({ updatedItem: undefined, itemIndex: undefined });
    }
  }, [params.updatedItem, params.itemIndex]);

  // ─── DB helpers ────────────────────────────────────────────────────────────
  const loadPendingItems = async () => {
    try {
      const rows = await db.getAllAsync(
        `SELECT id,barcode,name,COALESCE(bmrp,0) as bmrp,COALESCE(cost,0) as cost,
         COALESCE(quantity,0) as quantity,COALESCE(eCost,0) as eCost,
         COALESCE(currentStock,0) as currentStock,batchSupplier,scannedAt,
         batch_supplier,product,brand,COALESCE(isManualEntry,0) as isManualEntry
         FROM pending_items ORDER BY scannedAt DESC`
      );
      setScannedItems(rows);
    } catch { setScannedItems([]); }
  };

  const savePendingItem = async (item: any) => {
    await db.runAsync(
      `INSERT INTO pending_items (barcode,name,bmrp,cost,quantity,eCost,currentStock,batchSupplier,scannedAt,batch_supplier,product,brand,isManualEntry)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [item.barcode, item.name, item.bmrp||0, item.cost||0, item.quantity||0, item.eCost||0,
       item.currentStock||0, item.batchSupplier||"", item.scannedAt,
       item.batch_supplier||"", item.product||"", item.brand||"", item.isManualEntry||0]
    );
  };

  const deletePendingItem = async (id: number) => {
    await db.runAsync("DELETE FROM pending_items WHERE id=?", [id]);
  };

  const updatePendingItem = async (id: number, item: any) => {
    await db.runAsync(
      `UPDATE pending_items SET quantity=?,eCost=?,cost=?,bmrp=?,batchSupplier=? WHERE id=?`,
      [item.quantity, item.eCost, item.cost, item.bmrp, item.batchSupplier, id]
    );
  };

  const loadAllProducts = async () => {
    if (allProducts.length > 0) return;
    try {
      const rows = await db.getAllAsync(
        "SELECT code,name,barcode,quantity,bmrp,cost,batch_supplier FROM product_data LIMIT 5000"
      );
      setAllProducts(rows);
    } catch {}
  };

  const searchBarcodeWithVariants = async (barcode: string) => {
    const exact = await db.getAllAsync("SELECT * FROM product_data WHERE barcode=?", [barcode]);
    const v1 = await db.getAllAsync("SELECT * FROM product_data WHERE barcode LIKE ?", [`${barcode} :%`]);
    const v2 = await db.getAllAsync("SELECT * FROM product_data WHERE barcode LIKE ?", [`${barcode}:%`]);
    return [...exact, ...v1, ...v2];
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const toggleSearchMode = () => {
    const next = searchMode === "barcode" ? "name" : "barcode";
    setSearchMode(next);
    setManualBarcode(""); setSuggestions([]); setShowSuggestions(false);
    inputRef.current?.focus();
    if (next === "name") loadAllProducts();
  };

  const handleSearchTextChange = (text: string) => {
    setManualBarcode(text);
    if (searchMode === "name" && text.trim().length >= 2) {
      const q = text.toLowerCase().trim();
      const filtered = allProducts.filter((p: any) =>
        p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.product?.toLowerCase().includes(q)
      ).slice(0, 50);
      setSuggestions(filtered); setShowSuggestions(filtered.length > 0);
    } else { setSuggestions([]); setShowSuggestions(false); }
  };

  const handleNameInputChange = (text: string) => {
    setManualEntryData({ ...manualEntryData, name: text });
    if (text.trim().length >= 1) {
      const q = text.toLowerCase().trim();
      const names = Array.from(new Set(
        allProducts.filter((p: any) => p.name?.toLowerCase().startsWith(q)).map((p: any) => p.name).filter(Boolean)
      )).sort((a, b) => (a as string).localeCompare(b as string)).slice(0, 20) as string[];
      setNameSuggestions(names); setShowNameSuggestions(names.length > 0);
    } else { setNameSuggestions([]); setShowNameSuggestions(false); }
  };

  const handleSelectNameSuggestion = (name: string) => {
    setManualEntryData({ ...manualEntryData, name });
    setShowNameSuggestions(false); setNameSuggestions([]); Keyboard.dismiss();
  };

  const handleSelectSuggestion = (product: any) => {
    setShowSuggestions(false); setSuggestions([]); Keyboard.dismiss();
    addProductToList(product);
  };

  const addProductToList = async (product: any) => {
    if (scannedItems.length >= 50) {
      Alert.alert("Upload Limit Reached", "You've reached the 50 item limit. Please upload before adding more.", [{ text: "OK" }]);
      return;
    }
    const newItem = { ...product, quantity: 1, cost: product.cost ?? product.bmrp ?? 0,
      eCost: 0, currentStock: product.quantity ?? 0,
      batchSupplier: product.batch_supplier ?? "", scannedAt: Date.now(), isManualEntry: 0 };
    await savePendingItem(newItem);
    await loadPendingItems();
    setManualBarcode("");
    Toast.show({ type: "success", text1: "Added", text2: product.name, visibilityTime: 1000 });
  };

  const handleBarCodeScanned = async ({ data }: { data: string }, source: "scanner" | "manual" = "scanner") => {
    setIsScanning(true);
    if (scannedItems.length >= 50) {
      setIsScanning(false);
      Alert.alert("Upload Limit Reached", "You've reached the 50 item limit.", [{ text: "OK" }]);
      if (source === "scanner") { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; }
      return;
    }
    if (source === "scanner") {
      if (scanLockRef.current) { setIsScanning(false); return; }
      scanLockRef.current = true; setScanned(true);
      if (showScanner) setShowScanner(false);
    }
    try {
      const matches = await searchBarcodeWithVariants(data);
      if (matches.length === 0) {
        setIsScanning(false);
        Alert.alert("Product Not Found", `Barcode: ${data}\n\nNot in database.`, [{
          text: "OK", onPress: () => { if (source === "scanner") { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; } }
        }]);
        return;
      }
      if (matches.length === 1) {
        const product = matches[0] as any;
        const newItem = { ...product, quantity: 1, cost: product.cost ?? product.bmrp ?? 0,
          eCost: 0, currentStock: product.quantity ?? 0,
          batchSupplier: product.batch_supplier ?? "", scannedAt: Date.now(), isManualEntry: 0 };
        await savePendingItem(newItem);
        await loadPendingItems();
        setIsScanning(false);
        Toast.show({ type: "success", text1: "Scanned", text2: product.name, visibilityTime: 1000 });
        if (source === "scanner") setTimeout(() => { setScanned(false); scanLockRef.current = false; }, 500);
      } else {
        setSuggestions(matches); setShowSuggestions(true); setIsScanning(false);
        if (source === "scanner") setTimeout(() => { setScanned(false); scanLockRef.current = false; }, 500);
      }
    } catch {
      setIsScanning(false);
      Alert.alert("Error", "Failed to scan product.", [{
        text: "OK", onPress: () => { if (source === "scanner") { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; } }
      }]);
    }
  };

  const handleManualSearch = async () => {
    const trimmed = manualBarcode.trim();
    if (!trimmed) { Alert.alert("Error", "Please enter a search term"); return; }
    if (scannedItems.length >= 50) {
      Alert.alert("Upload Limit Reached", "50 item limit reached.", [{ text: "OK" }]); return;
    }
    if (searchMode === "barcode") {
      try {
        const matches = await searchBarcodeWithVariants(trimmed);
        if (matches.length === 0) {
          Alert.alert("Product Not Found", `Barcode: ${trimmed}\n\nNot in database.`, [{ text: "OK" }]); return;
        }
        if (matches.length === 1) {
          const product = matches[0] as any;
          const newItem = { ...product, quantity: 1, cost: product.cost ?? product.bmrp ?? 0,
            eCost: 0, currentStock: product.quantity ?? 0,
            batchSupplier: product.batch_supplier ?? "", scannedAt: Date.now(), isManualEntry: 0 };
          await savePendingItem(newItem); await loadPendingItems(); setManualBarcode("");
        } else { setSuggestions(matches); setShowSuggestions(true); }
      } catch { Alert.alert("Error", "Failed to fetch product."); }
    } else {
      const q = trimmed.toLowerCase();
      const matches = allProducts.filter((p: any) =>
        p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.product?.toLowerCase().includes(q)
      );
      if (matches.length === 1) await addProductToList(matches[0]);
      else if (matches.length > 1) { setSuggestions(matches); setShowSuggestions(true); }
      else Alert.alert("Not Found", `No products matching: "${trimmed}"`);
    }
  };

  const handleDeleteItem = (index: number) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const item = scannedItems[index];
        if (item.id) await deletePendingItem(item.id);
        await loadPendingItems();
      }},
    ]);
  };

  const handleOpenScanner = async () => {
    if (scannedItems.length >= 50) {
      Alert.alert("Upload Limit Reached", "50 item limit reached.", [{ text: "OK" }]); return;
    }
    setScanned(false); scanLockRef.current = false; processingAlertRef.current = false;
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert("Camera Permission", "Camera access required to scan."); return; }
    }
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setTimeout(() => { setScanned(false); scanLockRef.current = false; processingAlertRef.current = false; }, 500);
  };

  const openManualEntryModal = (barcode: string) => {
    setManualEntryData({ barcode, name: "", mrp: "", cost: "", quantity: "" });
    setShowManualEntryModal(true);
    setNameSuggestions([]); setShowNameSuggestions(false);
  };

  const closeManualEntryModal = () => {
    setShowManualEntryModal(false);
    setManualEntryData({ barcode: "", name: "", mrp: "", cost: "", quantity: "" });
    setNameSuggestions([]); setShowNameSuggestions(false);
  };

  const handleSaveManualEntry = async () => {
    if (scannedItems.length >= 50) {
      Alert.alert("Upload Limit Reached", "50 item limit reached.", [{ text: "OK" }]); return;
    }
    if (!manualEntryData.name.trim()) { Alert.alert("Validation Error", "Please enter an item name"); return; }
    const mrp = parseFloat(manualEntryData.mrp);
    const cost = parseFloat(manualEntryData.cost);
    const quantity = parseInt(manualEntryData.quantity);
    if (isNaN(mrp) || mrp < 0) { Alert.alert("Validation Error", "Please enter a valid MRP"); return; }
    if (isNaN(cost) || cost < 0) { Alert.alert("Validation Error", "Please enter a valid cost"); return; }
    if (isNaN(quantity) || quantity < 0) { Alert.alert("Validation Error", "Please enter a valid quantity"); return; }
    if (scannedItems.find(i => i.barcode === manualEntryData.barcode)) {
      Alert.alert("Info", "Product with this barcode already exists."); return;
    }
    const newItem = { barcode: manualEntryData.barcode, name: manualEntryData.name.trim(),
      bmrp: mrp, cost, quantity, eCost: 0, currentStock: quantity,
      batchSupplier: "", scannedAt: Date.now(), batch_supplier: "", product: "", brand: "", isManualEntry: 1 };
    await savePendingItem(newItem);
    await loadPendingItems();
    closeManualEntryModal();
    Toast.show({ type: "success", text1: "Manual Entry Added", text2: manualEntryData.name.trim(), visibilityTime: 2000 });
  };

  const updateQuantities = async () => {
    const incomplete = scannedItems.filter(i =>
      !i.bmrp || i.bmrp === 0 || isNaN(i.bmrp) ||
      !i.cost || i.cost === 0 || isNaN(i.cost) ||
      i.quantity == null || isNaN(i.quantity) || i.quantity <= 0
    );
    if (incomplete.length > 0) {
      Alert.alert("⚠️ Incomplete Data",
        `${incomplete.length} item(s) have missing/zero values:\n\n${incomplete.map(i => `• ${i.name}`).join("\n")}\n\nProceed?`,
        [{ text: "Cancel", style: "cancel" }, { text: "Proceed Anyway", style: "destructive", onPress: showFinalConfirmation }]
      );
    } else { showFinalConfirmation(); }
  };

  const showFinalConfirmation = () => {
    Alert.alert("Confirm Update", `Update quantities for ${scannedItems.length} item(s)?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Update", onPress: async () => {
        try {
          const userId = await SecureStore.getItemAsync("user_id");
          const today = new Date().toISOString().split("T")[0];
          let successCount = 0, errorCount = 0;

          for (const item of scannedItems) {
            try {
              const finalCost = item.eCost !== 0 ? item.eCost : item.cost;
              const isManual = item.isManualEntry === 1;
              let itemCode = item.barcode;
              if (!isManual) {
                const pd = await db.getFirstAsync("SELECT code FROM product_data WHERE barcode=?", [item.barcode]) as any;
                itemCode = pd?.code || item.barcode;
              }
              await saveOrderToSync({ userid: userId ?? "unknown", itemcode: itemCode,
                barcode: item.barcode, quantity: item.quantity, rate: finalCost ?? 0,
                mrp: item.bmrp ?? 0, order_date: today, product_name: item.name,
                is_manual_entry: isManual ? 1 : 0 });
              if (!isManual) {
                const exists = await db.getFirstAsync("SELECT 1 FROM product_data WHERE barcode=?", [item.barcode]);
                if (exists) await db.runAsync("UPDATE product_data SET quantity=?,cost=? WHERE barcode=?", [item.quantity, finalCost, item.barcode]);
              }
              successCount++;
            } catch { errorCount++; }
          }

          if (successCount > 0) await db.runAsync("DELETE FROM pending_items");

          if (errorCount === 0) {
            setScannedItems([]);
            Alert.alert("✅ Data Saved Locally", `All ${successCount} entries saved!\n\nUpload to server now?`, [
              { text: "No", style: "cancel", onPress: () => router.push("/(main)/") },
              { text: "Yes, Upload Now", onPress: () => router.push("/(main)/stock-upload") },
            ]);
          } else if (successCount > 0) {
            Alert.alert("⚠️ Partial Success", `${successCount} saved, ${errorCount} failed.`);
            await loadPendingItems();
          } else {
            Alert.alert("❌ Error", "Failed to save any entries.");
          }
        } catch { Alert.alert("Error", "Failed to save entries."); }
      }},
    ]);
  };

  // ─── Render helpers ────────────────────────────────────────────────────────
  const getCardStyle = (item: any, index: number) => {
    if (item.isManualEntry === 1) return s.manualCard;
    return index === 0 ? s.latestCard : s.regularCard;
  };

  const renderSuggestionItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={s.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={s.suggestionName} numberOfLines={1}>{item.name}</Text>
        <View style={s.chipRow}>
          <View style={s.chip}><Text style={s.chipLabel}>Stock: </Text><Text style={s.chipVal}>{Math.abs(item.quantity || 0)}</Text></View>
          <View style={s.chip}><Text style={s.chipLabel}>MRP: </Text><Text style={s.chipVal}>₹{item.bmrp || 0}</Text></View>
          {!!item.barcode && <View style={s.chip}><Text style={s.chipVal} numberOfLines={1}>{item.barcode}</Text></View>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
    </TouchableOpacity>
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────
 return (
    <View style={s.root}>
    <View style={{ flex: 1 }}>
      {/* Scanning overlay */}
      {isScanning && (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.overlayText}>Processing...</Text>
          </View>
        </View>
      )}

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={27} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>STOCK TAKING</Text>
      </View>

      {/* Manual Entry Modal */}
      <Modal visible={showManualEntryModal} animationType="slide" transparent={false} onRequestClose={closeManualEntryModal} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: C.white }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Product Manually</Text>
              <TouchableOpacity onPress={closeManualEntryModal} style={s.modalCloseBtn}>
                <Ionicons name="close" size={22} color={C.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Barcode *</Text>
                <TextInput style={[s.formInput, s.formInputDisabled]} value={manualEntryData.barcode} editable={false} />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Item Name *</Text>
                <View style={{ position: "relative", zIndex: 1000 }}>
                  <TextInput style={s.formInput} value={manualEntryData.name} onChangeText={handleNameInputChange}
                    placeholder="Enter or select product name" placeholderTextColor={C.textMuted}
                    autoCapitalize="words" autoFocus
                    onFocus={() => { setIsEditing(true); isEditingRef.current = true; }}
                    onBlur={() => { setIsEditing(false); isEditingRef.current = false; setTimeout(() => setShowNameSuggestions(false), 200); }} />
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <ScrollView style={s.autocompleteList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {nameSuggestions.map((name, i) => (
                        <TouchableOpacity key={`${name}-${i}`} style={s.autocompleteItem} onPress={() => handleSelectNameSuggestion(name)}>
                          <Text style={{ fontSize: 15, color: C.text }} numberOfLines={1}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
              {[
                { label: "MRP (₹) *", key: "mrp", kbType: "decimal-pad" as const },
                { label: "Cost (₹) *", key: "cost", kbType: "decimal-pad" as const },
                { label: "Quantity *",  key: "quantity", kbType: "number-pad" as const },
              ].map(({ label, key, kbType }) => (
                <View style={s.formGroup} key={key}>
                  <Text style={s.formLabel}>{label}</Text>
                  <TextInput style={s.formInput}
                    value={(manualEntryData as any)[key]}
                    onChangeText={(t) => setManualEntryData({ ...manualEntryData, [key]: t })}
                    placeholder="0" placeholderTextColor={C.textMuted} keyboardType={kbType}
                    onFocus={() => { setIsEditing(true); isEditingRef.current = true; }}
                    onBlur={() => { setIsEditing(false); isEditingRef.current = false; }} />
                </View>
              ))}
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.border }]} onPress={closeManualEntryModal}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: C.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.primary }]} onPress={handleSaveManualEntry}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: C.white }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Camera Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={handleCloseScanner}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={{ flex: 1 }} facing="back"
            onBarcodeScanned={scanned ? undefined : (d) => handleBarCodeScanned(d, "scanner")}
            barcodeScannerSettings={{ barcodeTypes: ["qr","ean13","ean8","code128","code39","upc_a","upc_e","code93","itf14"] }}
          >
            <View style={s.scanOverlay}>
              <TouchableOpacity style={s.scanCloseBtn} onPress={handleCloseScanner}>
                <Ionicons name="close" size={32} color={C.white} />
              </TouchableOpacity>
              <View style={s.scanFrame}>
                {(["topLeft","topRight","bottomLeft","bottomRight"] as const).map(pos => (
                  <View key={pos} style={[s.corner, s[pos]]} />
                ))}
              </View>
              <View style={s.scanHint}>
                <Text style={{ color: C.white, fontSize: 16, textAlign: "center" }}>
                  {scanned ? "Processing..." : "Align barcode within the frame"}
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Hidden hardware scanner input */}
      {searchMode === "barcode" && !showManualEntryModal && !showScanner && (
        <TextInput ref={inputRef} autoFocus value={hardwareScanValue}
          onChangeText={setHardwareScanValue}
          style={{ height: 1, width: 1, opacity: 0, position: "absolute" }}
          showSoftInputOnFocus={false} blurOnSubmit={false}
          onBlur={() => {
            setTimeout(() => {
              if (!isEditingRef.current && !showManualEntryModal && !showScanner && !manualBarcode.length)
                inputRef.current?.focus();
            }, 300);
          }}
        />
      )}

      {/* Search header */}
      <View style={s.header}>
        {/* Toggle */}
        <View style={s.toggle}>
          {(["barcode", "name"] as const).map((mode, i) => (
            <TouchableOpacity key={mode}
              style={[s.toggleBtn, i === 0 && s.toggleBtnLeft, searchMode === mode && s.toggleBtnActive]}
              onPress={() => searchMode !== mode && toggleSearchMode()}
            >
              <Ionicons name={mode === "barcode" ? "barcode-outline" : "search"} size={17}
                color={searchMode === mode ? C.white : C.textSub} style={{ marginRight: 6 }} />
              <Text style={[s.toggleText, searchMode === mode && { color: C.white, fontWeight: "600" }]}>
                {mode === "barcode" ? "Barcode Search" : "Item Search"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search row */}
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder={searchMode === "barcode" ? "Enter barcode manually" : "Search by name..."}
            placeholderTextColor={C.textMuted}
            value={manualBarcode} onChangeText={handleSearchTextChange}
            keyboardType="default" returnKeyType="search" onSubmitEditing={handleManualSearch}
            onFocus={() => { setIsEditing(true); isEditingRef.current = true; inputRef.current?.blur(); setHardwareScanValue(""); }}
            onBlur={() => { setIsEditing(false); isEditingRef.current = false; }}
          />
          <TouchableOpacity style={s.getBtn} onPress={handleManualSearch}>
            <Text style={{ color: C.white, fontWeight: "600", fontSize: 15 }}>Get</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions or list */}
      {showSuggestions && suggestions.length > 0 ? (
        <View style={{ height: Dimensions.get('window').height - 220, marginHorizontal: 16, marginTop: 4, marginBottom: 16 }}>
          {searchMode === "barcode" && suggestions.length > 1 && (
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSub, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              Found {suggestions.length} variants — select one:
            </Text>
          )}
          <FlatList
            data={suggestions}
            keyExtractor={(item, i) => `${item.barcode}-${i}`}
            renderItem={renderSuggestionItem}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
            style={{ flex: 1, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12 }}
          />
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ padding: 16 }}>
              {/* Header row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={s.sectionTitle}>Scanned Products</Text>
                <View style={[s.countBadge, { backgroundColor: scannedItems.length >= 50 ? C.danger : scannedItems.length >= 40 ? C.warning : C.primary }]}>
                  <Text style={{ color: C.white, fontWeight: "700", fontSize: 14 }}>{scannedItems.length}/50</Text>
                </View>
              </View>

              {scannedItems.length >= 50 && (
                <Text style={{ color: C.danger, fontSize: 13, marginBottom: 8, fontWeight: "600" }}>
                  ⚠️ Limit reached. Upload items before adding more.
                </Text>
              )}

              {scannedItems.length === 0 && (
                <Text style={s.emptyText}>
                  No products scanned yet. Start scanning or enter a {searchMode === "barcode" ? "barcode" : "product name"} manually.
                </Text>
              )}

              {scannedItems.filter(Boolean).map((item, index) => (
                <View key={`${item.barcode}-${index}-${item.scannedAt}`} style={[s.card, getCardStyle(item, index)]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      {item.isManualEntry === 1 && (
                        <View style={s.manualBadge}><Text style={s.manualBadgeText}>MANUAL ENTRY</Text></View>
                      )}
                      <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.cardBarcode}>{item.barcode}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteItem(index)} style={s.deleteBtn}>
                      <Ionicons name="trash-outline" size={14} color={C.white} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                    <Text style={s.detailText}>MRP: <Text style={{ fontWeight: "600", color: C.success }}>₹{item.bmrp || 0}</Text></Text>
                    <Text style={s.detailText}>Stock: <Text style={{ fontWeight: "600", color: C.text }}>{item.currentStock}</Text></Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <Text style={[s.detailText, { fontSize: 15, fontWeight: "600" }]}>E.Qty:</Text>
                    <TouchableOpacity style={s.qtyBtn}
                      onPress={() => {
                        const q = Math.max(1, (item.quantity || 1) - 1);
                        const updated = [...scannedItems]; updated[index] = { ...updated[index], quantity: q };
                        setScannedItems(updated);
                        if (item.id) updatePendingItem(item.id, { ...item, quantity: q });
                      }}>
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <QtyInput value={item.quantity || 1}
                      onEditingChange={(v) => { setIsEditing(v); isEditingRef.current = v; }}
                      onRefocusHidden={() => setTimeout(() => inputRef.current?.focus(), 50)}
                      onChange={(num) => {
                        const updated = [...scannedItems]; updated[index] = { ...updated[index], quantity: num };
                        setScannedItems(updated);
                        if (item.id) updatePendingItem(item.id, { ...item, quantity: num });
                      }} />
                    <TouchableOpacity style={s.qtyBtn}
                      onPress={() => {
                        const q = (item.quantity || 1) + 1;
                        const updated = [...scannedItems]; updated[index] = { ...updated[index], quantity: q };
                        setScannedItems(updated);
                        if (item.id) updatePendingItem(item.id, { ...item, quantity: q });
                      }}>
                      <Text style={s.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={{ marginTop: 32, marginBottom: 24 }}>
                <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center" }}>Powered by IMC Business Solutions</Text>
              </View>
            </View>
          </ScrollView>
       </>
      )}
    </View>

    {/* Bottom bar - outside KAV so keyboard never pushes it up */}
   {!showSuggestions && (
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[s.bottomBtn, { flex: 1, backgroundColor: scannedItems.length > 0 ? C.accent : C.border }]}
          disabled={scannedItems.length === 0} onPress={updateQuantities}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={C.white} style={{ marginRight: 6 }} />
          <Text style={s.bottomBtnText}>Save ({scannedItems.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bottomBtn, { flex: 1, backgroundColor: C.primary }]} onPress={handleOpenScanner}>
          <Ionicons name="scan-outline" size={18} color={C.white} style={{ marginRight: 6 }} />
          <Text style={s.bottomBtnText}>Scanner</Text>
        </TouchableOpacity>
      </View>
    )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, height: Dimensions.get("window").height },

  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  overlayCard: { backgroundColor: C.white, borderRadius: 16, padding: 28, alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  overlayText: { fontSize: 16, fontWeight: "600", color: C.text },

 topBar: { 
  flexDirection: "row", 
  alignItems: "center", 
  justifyContent: "center",
  paddingTop: Platform.OS === "ios" ? 54 : 16, 
  paddingHorizontal: 16, 
  paddingBottom: 8, 
  backgroundColor: C.bg 
},

backBtn: { 
  position: "absolute", 
  left: 16, 
  top: Platform.OS === "ios" ? 54 : 16,  // ← match paddingTop of topBar
  width: 48, 
  height: 28, 
  borderRadius: 10, 
  alignItems: "center", 
  justifyContent: "center" 
},  

topTitle: { 
  fontSize: 23, 
  fontWeight: "900", 
  color: C.primary, 
  marginLeft: 12,
  // ← removed marginBottom: 15
},

  header: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.bg },

  toggle: { flexDirection: "row", marginBottom: 10, backgroundColor: C.white, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, overflow: "hidden" },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11, paddingHorizontal: 12, backgroundColor: C.white },
  toggleBtnLeft: { borderRightWidth: 1, borderRightColor: C.border },
  toggleBtnActive: { backgroundColor: C.primary },
  toggleText: { fontSize: 13, fontWeight: "500", color: C.textSub },

  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, borderWidth: 1.5, borderColor: C.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.white, fontSize: 15, color: C.text },
  getBtn: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },

  suggestionsBox: { flex: 1, backgroundColor: C.white, marginHorizontal: 16, marginTop: 4, marginBottom: 16, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  suggestionItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  suggestionName: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: C.primaryLt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  chipLabel: { fontSize: 11, fontWeight: "600", color: C.textSub },
  chipVal: { fontSize: 11, fontWeight: "500", color: C.text },

  sectionTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  countBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  emptyText: { textAlign: "center", color: C.textMuted, fontStyle: "italic", marginTop: 16, fontSize: 15 },

  card: { marginBottom: 8, borderRadius: 12, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 2, elevation: 2 },
  latestCard: { backgroundColor: C.warningLt, borderWidth: 1.5, borderColor: C.warningBdr },
  regularCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  manualCard: { backgroundColor: "#F0FDF4", borderWidth: 1.5, borderColor: "#86EFAC" },

  cardName: { fontWeight: "700", fontSize: 15, color: C.text, marginBottom: 2 },
  cardBarcode: { fontSize: 13, color: C.textSub },

  manualBadge: { backgroundColor: C.primaryLt, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start", marginBottom: 4 },
  manualBadgeText: { fontSize: 10, fontWeight: "700", color: C.primary, letterSpacing: 0.5 },

  deleteBtn: { backgroundColor: C.danger, padding: 8, borderRadius: 8 },
  detailText: { fontSize: 13, color: C.textSub },

  qtyBtn: { backgroundColor: C.primary, width: 30, height: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: C.white, fontSize: 18, fontWeight: "bold", lineHeight: 22 },
  qtyInput: { borderWidth: 1.5, borderColor: C.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, minWidth: 70, height: 33, textAlign: "center", fontSize: 14, fontWeight: "600", color: C.primary, backgroundColor: C.white },

  bottomBar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border, position: "absolute", bottom: 0, left: 0, right: 0 },
  bottomBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 14, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  bottomBtnText: { color: C.white, fontWeight: "700", fontSize: 15 },

  modalHeader: { backgroundColor: C.primary, paddingTop: Platform.OS === "ios" ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: C.white },
  modalCloseBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  modalFooter: { flexDirection: "row", gap: 12, padding: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  modalBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  formGroup: { marginBottom: 22 },
  formLabel: { fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 8 },
  formInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, backgroundColor: C.white, color: C.text },
  formInputDisabled: { backgroundColor: C.bg, color: C.textSub },
  autocompleteList: { position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 200, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, zIndex: 1001, elevation: 5 },
  autocompleteItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bg },

  scanOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  scanCloseBtn: { position: "absolute", top: Platform.OS === "ios" ? 50 : 40, right: 20, zIndex: 10, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, padding: 8 },
  scanFrame: { width: 280, height: 280, position: "relative" },
  corner: { position: "absolute", width: 40, height: 40, borderColor: C.accent },
  topLeft:    { top: 0, left: 0,    borderTopWidth: 4, borderLeftWidth: 4 },
  topRight:   { top: 0, right: 0,   borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight:{ bottom: 0, right: 0,borderBottomWidth: 4, borderRightWidth: 4 },
  scanHint: { position: "absolute", bottom: 100, backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
});