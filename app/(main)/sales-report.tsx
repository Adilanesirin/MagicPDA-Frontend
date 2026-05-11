import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  NativeModules,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// IN-APP LOGGER
// ─────────────────────────────────────────────────────────────────────────────
type LogLevel = "INFO" | "WARN" | "ERROR" | "OK";
interface LogEntry { ts: string; level: LogLevel; msg: string; }

let _setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>> | null = null;

function plog(level: LogLevel, msg: string) {
  const ts = new Date().toISOString().slice(11, 23);
  const line = `[${level}][${ts}] ${msg}`;
  if (level === "ERROR") console.error("[BLEPrint]", line);
  else if (level === "WARN")  console.warn("[BLEPrint]", line);
  else                        console.log("[BLEPrint]", line);
  _setLogs?.((p) => [{ ts, level, msg }, ...p].slice(0, 80));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const { width } = Dimensions.get("window");
const db = SQLite.openDatabaseSync("magicpedia.db");

const C = {
  primary:   "#131f3d",
  accent:    "#43b1d6",
  accentLt:  "#EFF9FD",
  bg:        "#F1F5F9",
  white:     "#FFFFFF",
  border:    "#E2E8F0",
  text:      "#0F172A",
  textSub:   "#64748B",
  textMuted: "#94A3B8",
  logBg:     "#0d1117",
  success:   "#059669",
  danger:    "#dc2626",
  warn:      "#d97706",
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type FilterType = "pending" | "synced";

interface PendingItem {
  id: number; barcode: string; name: string; quantity: number;
  bmrp: number; cost: number; eCost: number; S1: number;
  currentStock: number; isManualEntry: number; scannedAt: number;
}
interface SyncedItem {
  id: number; barcode: string; name: string; quantity: number;
  rate: number; mrp: number; sale_date: string; created_at: string;
  customer: string; enclosures: string; is_manual_entry: number;
}
type ReportItem =
  | (PendingItem & { type: "pending" })
  | (SyncedItem  & { type: "synced"  });

interface BLEDevice {
  device_name: string;
  inner_mac_address: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SalesReportScreen() {
  const router = useRouter();

  // Data state
  const [filter, setFilter]               = useState<FilterType>("pending");
  const [items, setItems]                 = useState<ReportItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ReportItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [pendingCount, setPendingCount]   = useState(0);
  const [syncedCount, setSyncedCount]     = useState(0);

  // Edit qty
  const [editingItem, setEditingItem] = useState<{ id: number; qty: number } | null>(null);
  const [editQty, setEditQty]         = useState("");

  // Printer state
  const [printerReady, setPrinterReady]         = useState(false);
  const [printing, setPrinting]                 = useState(false);
  const [scanning, setScanning]                 = useState(false);
  const [devices, setDevices]                   = useState<BLEDevice[]>([]);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [connectedDevice, setConnectedDevice]   = useState<BLEDevice | null>(null);
  const BLERef = useRef<any>(null);

  // Log panel
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [firmInfo, setFirmInfo] = useState<any>(null);

  // Wire global logger to local state
  useEffect(() => {
    _setLogs = setLogs;
    import("expo-secure-store").then(SecureStore => {
      SecureStore.getItemAsync("firm_info").then(val => {
        if (val) setFirmInfo(JSON.parse(val));
      });
    });
    return () => { _setLogs = null; };
  }, []);

  // Load native printer module on mount
  useEffect(() => {
    plog("INFO", "Initialising BLE printer module…");
    try {
      const lib = require("react-native-thermal-receipt-printer");
      plog("INFO", "require() succeeded");

      const allKeys = Object.keys(NativeModules);
      const bleKeys = allKeys.filter(k =>
        k.toLowerCase().includes("print") ||
        k.toLowerCase().includes("ble")   ||
        k.toLowerCase().includes("bluetooth") ||
        k.toLowerCase().includes("thermal")
      );
      plog("INFO", `Total NativeModules: ${allKeys.length}`);
      plog("INFO", `BLE/Print modules: ${bleKeys.length > 0 ? bleKeys.join(", ") : "NONE FOUND"}`);

      if (NativeModules.RNBLEPrinter) {
        plog("OK", "RNBLEPrinter native module found ✅");
        BLERef.current = lib.BLEPrinter;
        const methods = Object.keys(lib.BLEPrinter || {});
        plog("INFO", `BLEPrinter methods: ${methods.join(", ")}`);
        setPrinterReady(true);
      } else {
        plog("ERROR", "RNBLEPrinter NOT in NativeModules ❌");
        plog("WARN", "You are running in Expo Go — BLE native module is NOT bundled");
        plog("WARN", "Fix: npx expo prebuild  →  npx expo run:android");
        setPrinterReady(false);
      }
    } catch (e: any) {
      plog("ERROR", `require() threw: ${e?.message}`);
      plog("ERROR", e?.stack ?? "no stack");
      setPrinterReady(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [filter]);
  useEffect(() => { applySearch(); }, [searchQuery, items]);

  const applySearch = () => {
    if (!searchQuery.trim()) { setFilteredItems(items); return; }
    const q = searchQuery.toLowerCase();
    setFilteredItems(items.filter(i =>
      (i.barcode || "").toLowerCase().includes(q) ||
      (i.name    || "").toLowerCase().includes(q) ||
      (filter === "synced" && ((i as SyncedItem).customer || "").toLowerCase().includes(q))
    ));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const pc = await db.getFirstAsync("SELECT COUNT(*) as count FROM pending_sales_items") as { count: number } | null;
      const sc = await db.getFirstAsync("SELECT COUNT(*) as count FROM sales_to_sync WHERE sync_status = 'synced'") as { count: number } | null;
      setPendingCount(pc?.count || 0);
      setSyncedCount(sc?.count || 0);

      if (filter === "pending") {
        const rows = await db.getAllAsync(
          `SELECT id, barcode, name, quantity,
            COALESCE(bmrp,0) as bmrp, COALESCE(cost,0) as cost,
            COALESCE(eCost,0) as eCost, COALESCE(S1,0) as S1,
            COALESCE(currentStock,0) as currentStock,
            COALESCE(isManualEntry,0) as isManualEntry,
            COALESCE(scannedAt,0) as scannedAt
           FROM pending_sales_items ORDER BY scannedAt DESC`
        ) as any[];
        setItems((rows || []).map(r => ({ ...r, type: "pending" as const })));
      } else {
        const rows = await db.getAllAsync(
          `SELECT id, barcode, COALESCE(product_name, barcode) as name,
            quantity, COALESCE(rate,0) as rate, COALESCE(mrp,0) as mrp,
            COALESCE(sale_date,'') as sale_date, COALESCE(created_at,'') as created_at,
            COALESCE(customer,'') as customer, COALESCE(enclosures,'') as enclosures,
            COALESCE(is_manual_entry,0) as is_manual_entry
           FROM sales_to_sync WHERE sync_status = 'synced' ORDER BY created_at DESC`
        ) as any[];
        setItems((rows || []).map(r => ({ ...r, type: "synced" as const })));
      }
    } catch (e) {
      console.error("[LOAD]", e);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleSaveQty = async () => {
    if (!editingItem) return;
    const newQty = parseInt(editQty);
    if (isNaN(newQty) || newQty < 1) return;
    const table = filter === "pending" ? "pending_sales_items" : "sales_to_sync";
    await db.runAsync(`UPDATE ${table} SET quantity = ? WHERE id = ?`, [newQty, editingItem.id]);
    setEditingItem(null);
    loadData();
  };

  const formatDate = (d: string | number) => {
    try {
      const date = typeof d === "number" ? new Date(d) : new Date(d);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch { return String(d); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RECEIPT BUILDER
  // ─────────────────────────────────────────────────────────────────────────────
  const buildReceipt = (): string => {
    const SEP = "================================================";
    const DIV = "------------------------------------------------";
    const now = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

    const f = firmInfo;
    const BOLD_ON      = "\x1B\x45\x01";
    const BOLD_OFF     = "\x1B\x45\x00";
    const ALIGN_CENTER = "\x1B\x61\x01";
    const ALIGN_LEFT   = "\x1B\x61\x00";

    // Prepend ALIGN_CENTER to every line so printer re-centers after each \n
    const C_LINE = (text: string) => ALIGN_CENTER + text;

    const lines: string[] = [
      C_LINE(BOLD_ON + (f?.firm_name || "IMC BUSINESS SOLUTIONS") + BOLD_OFF),
      ...(f?.address  ? [C_LINE(f.address)]  : [C_LINE("PALAKUNNUMMAL BUILDINGS")]),
      ...(f?.address1 ? [C_LINE(f.address1)] : []),
      ...(f?.address2 ? [C_LINE(f.address2)] : [C_LINE("KALPETTA, WAYANAD - 673121")]),
      ...(f?.mobile   ? [C_LINE(`Ph: ${f.mobile}`)] : [C_LINE("Ph: 9946545535")]),
      ...(f?.tinno    ? [C_LINE(`GSTIN: ${f.tinno}`)] : []),
      C_LINE(SEP),
      C_LINE(BOLD_ON + (filter === "pending" ? "CART" : "SALES") + BOLD_OFF),
      C_LINE(`Date: ${now}`),
      C_LINE(SEP),
      C_LINE(""),
    ];

    if (filteredItems.length === 0) {
      lines.push(C_LINE("No items to print"));
    } else {
      filteredItems.forEach((item, idx) => {
        if (item.type === "pending") {
          const p = item as PendingItem & { type: "pending" };
          lines.push(C_LINE(BOLD_ON + `${idx + 1}. ${(p.name || "Unknown").slice(0, 40)}` + BOLD_OFF));
          lines.push(C_LINE(p.barcode));
          lines.push(C_LINE(`Qty: ${p.quantity}   MRP: Rs.${p.bmrp}   Price: Rs.${p.S1}`));
          if (p.currentStock !== undefined) lines.push(C_LINE(`Stock: ${p.currentStock}`));
        } else {
          const sv = item as SyncedItem & { type: "synced" };
          const parts = (sv.customer || "").split("|");
          const custName  = parts[0]?.trim() || "";
          const custPhone = parts[1]?.trim() || sv.enclosures?.trim() || "";
          lines.push(C_LINE(BOLD_ON + `${idx + 1}. ${(sv.name || "Unknown").slice(0, 40)}` + BOLD_OFF));
          lines.push(C_LINE(sv.barcode));
          lines.push(C_LINE(`Qty: ${sv.quantity}   Rate: Rs.${sv.rate}   MRP: Rs.${sv.mrp}`));
          if (custName)  lines.push(C_LINE(`Customer: ${custName}`));
          if (custPhone) lines.push(C_LINE(`Phone: ${custPhone}`));
        }
        if (idx < filteredItems.length - 1) lines.push(C_LINE(DIV));
      });
    }

    lines.push(C_LINE(""), C_LINE(SEP), C_LINE(BOLD_ON + `Total Items: ${filteredItems.length}` + BOLD_OFF), C_LINE(SEP));
    lines.push(C_LINE(BOLD_ON + "Thank You!" + BOLD_OFF), C_LINE("Powered by IMC Business Solutions"), ALIGN_LEFT + "\n\n\n");

    const result = lines.join("\n");

    if (result.length > 4000) {
      plog("WARN", `Receipt too large (${result.length} chars), truncating…`);
      return result.slice(0, 4000) + "\n\nTRUNCATED\n\n\n";
    }

    return result;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // BLUETOOTH
  // ─────────────────────────────────────────────────────────────────────────────
  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;
    try {
      if (Platform.Version >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        plog("INFO", `Permissions response: ${JSON.stringify(results)}`);
        const allGranted = Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
        if (!allGranted) {
          plog("WARN", "Bluetooth permissions not granted: " + JSON.stringify(results));
          Alert.alert("Permission Denied", "Bluetooth permissions are required to scan for printers.\n\nGo to Settings → Apps → IMCSync → Permissions → Allow 'Nearby devices'.");
          return false;
        }
      } else {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          plog("WARN", "Location permission denied (needed for BLE on Android ≤11)");
          Alert.alert("Permission Denied", "Location permission is required for Bluetooth scanning on this device.");
          return false;
        }
      }
      plog("OK", "Bluetooth permissions granted ✅");
      return true;
    } catch (e: any) {
      plog("ERROR", `Permission request failed: ${e?.message}`);
      return false;
    }
  };

  const handleScanDevices = async () => {
    if (!printerReady || !BLERef.current) {
      Alert.alert(
        "Printer Module Not Loaded",
        "This requires a custom dev build, not Expo Go.\n\nSteps:\n1. npx expo prebuild --platform android\n2. npx expo run:android\n3. Open the installed app (NOT Expo Go)",
        [{ text: "Show Logs", onPress: () => setShowLogs(true) }, { text: "OK" }]
      );
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) return;

    plog("INFO", "=== SCAN STARTED ===");
    setScanning(true);
    try {
      plog("INFO", "Calling BLEPrinter.init()…");
      await BLERef.current.init();
      plog("OK", "init() completed");

      plog("INFO", "Calling BLEPrinter.getDeviceList()…");
      const list: BLEDevice[] = await BLERef.current.getDeviceList();
      plog("INFO", `Raw response: ${JSON.stringify(list)}`);

      if (!list || list.length === 0) {
        plog("WARN", "No paired devices found");
        Alert.alert("No Printers Found", "Make sure your thermal printer is:\n1. Turned ON\n2. Paired in Android Settings → Bluetooth\n\nThen tap the print button again.");
        return;
      }

      list.forEach((d, i) => plog("INFO", `  [${i}] name="${d.device_name}" mac="${d.inner_mac_address}"`));
      setDevices(list);
      setShowDevicePicker(true);
    } catch (e: any) {
      const errorMsg = typeof e === "string" ? e : (e?.message || "Could not scan for Bluetooth devices.");
      plog("ERROR", `Scan failed: ${errorMsg}`);
      Alert.alert("Scan Error", errorMsg, [
        { text: "Show Logs", onPress: () => setShowLogs(true) }, { text: "OK" }
      ]);
    } finally {
      setScanning(false);
      plog("INFO", "=== SCAN ENDED ===");
    }
  };

  const handleConnectAndPrint = async (device: BLEDevice) => {
    setShowDevicePicker(false);
    plog("INFO", "=== PRINT JOB STARTED ===");
    plog("INFO", `Target: "${device.device_name}" MAC: ${device.inner_mac_address}`);
    plog("INFO", `Items to print: ${filteredItems.length}`);

    if (filteredItems.length === 0) {
      Alert.alert("Nothing to Print", "No items in the current list.");
      return;
    }

    setPrinting(true);
    try {
      plog("INFO", `Connecting to MAC: ${device.inner_mac_address}…`);
      await BLERef.current.connectPrinter(device.inner_mac_address);
      plog("OK", `Connected to "${device.device_name}" ✅`);
      setConnectedDevice(device);

      const receipt = buildReceipt();
      plog("INFO", `Receipt built: ${receipt.length} chars`);
      plog("INFO", "Calling printBill()…");

      await BLERef.current.printBill(receipt);
      plog("OK", "printBill() succeeded ✅");

      Alert.alert("✅ Printed!", `Receipt sent to ${device.device_name}`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      plog("ERROR", `Print failed: ${msg}`);
      plog("ERROR", e?.stack ?? "no stack");

      let friendly = msg;
      if (/not found|no device/i.test(msg))
        friendly = "Printer not found. Make sure it is on and paired in Bluetooth settings.";
      else if (/connect|socket/i.test(msg))
        friendly = "Connection refused. Turn the printer off and on, then try again.";
      else if (/permission|bluetooth/i.test(msg))
        friendly = "Bluetooth permission denied. Go to App Settings and allow Bluetooth.";

      Alert.alert("Print Error", friendly, [
        { text: "Show Logs", onPress: () => setShowLogs(true) }, { text: "OK" }
      ]);
    } finally {
      setPrinting(false);
      plog("INFO", "=== PRINT JOB ENDED ===");
    }
  };

  const handleQuickPrint = async () => {
    if (!printerReady || !BLERef.current) {
      Alert.alert(
        "Printer Module Not Loaded",
        "You must use a custom build, not Expo Go.\n\nRun:\n  npx expo prebuild\n  npx expo run:android",
        [{ text: "Show Logs", onPress: () => setShowLogs(true) }, { text: "OK" }]
      );
      return;
    }
    if (connectedDevice) {
      await handleConnectAndPrint(connectedDevice);
    } else {
      await handleScanDevices();
    }
  };

  const logColor = (level: LogLevel) => {
    if (level === "ERROR") return "#fca5a5";
    if (level === "WARN")  return "#fde68a";
    if (level === "OK")    return "#86efac";
    return "#7dd3fc";
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER CARDS
  // ─────────────────────────────────────────────────────────────────────────────
  const renderPendingCard = (item: PendingItem & { type: "pending" }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          {item.isManualEntry === 1 && (
            <View style={s.manualBadge}><Text style={s.manualBadgeText}>MANUAL</Text></View>
          )}
          <Text style={s.cardName} numberOfLines={1}>{item.name || "Unknown Product"}</Text>
          <Text style={s.cardBarcode}>{item.barcode}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[s.badgeText, { color: C.warn }]}>In Cart</Text>
        </View>
      </View>
      <View style={s.divider} />
      <View style={s.metaRow}>
        <TouchableOpacity
          style={s.metaItem}
          onPress={() => { setEditingItem({ id: item.id, qty: item.quantity }); setEditQty(String(item.quantity)); }}
        >
          <Text style={s.metaLabel}>Qty</Text>
          <Text style={[s.metaValue, s.editableVal]}>{item.quantity || 0} ✎</Text>
        </TouchableOpacity>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>MRP</Text>
          <Text style={s.metaValue}>₹{item.bmrp || 0}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>S.Price</Text>
          <Text style={s.metaValue}>₹{item.S1 || 0}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Stock</Text>
          <Text style={[s.metaValue, { color: "#2563eb" }]}>{item.currentStock}</Text>
        </View>
      </View>
      <Text style={s.cardDate}>{formatDate(item.scannedAt)}</Text>
    </View>
  );

  const renderSyncedCard = (item: SyncedItem & { type: "synced" }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          {item.is_manual_entry === 1 && (
            <View style={s.manualBadge}><Text style={s.manualBadgeText}>MANUAL</Text></View>
          )}
          <Text style={s.cardName} numberOfLines={1}>{item.name || "Unknown Product"}</Text>
          <Text style={s.cardBarcode}>{item.barcode}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: "#D1FAE5" }]}>
          <Text style={[s.badgeText, { color: C.success }]}>Synced</Text>
        </View>
      </View>
      {(item.customer || item.enclosures) ? (
        <View style={s.customerRow}>
          <Ionicons name="person-outline" size={12} color={C.accent} />
          <Text style={s.customerText}>
            {[item.customer, item.enclosures].filter(Boolean).join("  •  ")}
          </Text>
        </View>
      ) : null}
      <View style={s.divider} />
      <View style={s.metaRow}>
        <TouchableOpacity
          style={s.metaItem}
          onPress={() => { setEditingItem({ id: item.id, qty: item.quantity }); setEditQty(String(item.quantity)); }}
        >
          <Text style={s.metaLabel}>Qty</Text>
          <Text style={[s.metaValue, s.editableVal]}>{item.quantity || 0} ✎</Text>
        </TouchableOpacity>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Rate</Text>
          <Text style={s.metaValue}>₹{item.rate}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>MRP</Text>
          <Text style={s.metaValue}>₹{item.mrp}</Text>
        </View>
      </View>
      <Text style={s.cardDate}>{formatDate(item.created_at || item.sale_date)}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: ReportItem }) =>
    item.type === "pending"
      ? renderPendingCard(item as PendingItem & { type: "pending" })
      : renderSyncedCard(item as SyncedItem & { type: "synced" });

  const renderEmpty = () => (
    <View style={s.emptyWrap}>
      <Ionicons name={filter === "synced" ? "checkmark-circle-outline" : "cart-outline"} size={48} color={C.border} />
      <Text style={s.emptyTitle}>{filter === "synced" ? "No Synced Sales" : "Cart is Empty"}</Text>
      <Text style={s.emptySubtitle}>
        {filter === "synced" ? "Uploaded sales will appear here." : "No items in cart yet."}
      </Text>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f4f8" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <Text style={s.pageTitle}>SALES REPORT</Text>

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setShowLogs(v => !v)}
              style={[s.iconBtn, showLogs && { backgroundColor: C.accent }]}
            >
              <Ionicons name="terminal-outline" size={18} color={showLogs ? C.white : "#94A3B8"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleQuickPrint}
              disabled={printing || scanning}
              style={[s.iconBtn, (printing || scanning) && { opacity: 0.5 }]}
            >
              {printing || scanning
                ? <ActivityIndicator size="small" color="#94A3B8" />
                : <Ionicons name="print-outline" size={20} color="#94A3B8" />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Printer status strip */}
        <View style={[s.statusStrip, { backgroundColor: printerReady ? "#d1fae5" : "#fee2e2" }]}>
          <Ionicons
            name={printerReady ? "bluetooth" : "bluetooth-outline"}
            size={12}
            color={printerReady ? C.success : C.danger}
          />
          <Text style={[s.statusText, { color: printerReady ? C.success : C.danger }]} numberOfLines={1}>
            {printerReady
              ? `BLE module loaded ✅${connectedDevice ? `  •  ${connectedDevice.device_name}` : "  •  Tap 🖨 to scan"}`
              : "BLE module NOT found — needs custom build, not Expo Go"}
          </Text>
        </View>
      </View>

      {/* ── In-app log panel ── */}
      {showLogs && (
        <View style={s.logPanel}>
          <View style={s.logPanelHeader}>
            <Text style={s.logPanelTitle}>🖥 Printer Logs ({logs.length})</Text>
            <TouchableOpacity onPress={() => setLogs([])} style={s.logClearBtn}>
              <Text style={s.logClearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.logScroll} nestedScrollEnabled>
            {logs.length === 0
              ? <Text style={s.logEmpty}>No logs yet — tap the print button.</Text>
              : logs.map((e, i) => (
                  <Text key={i} style={[s.logLine, { color: logColor(e.level) }]}>
                    {e.ts} [{e.level}] {e.msg}
                  </Text>
                ))
            }
          </ScrollView>
        </View>
      )}

      {/* ── Search ── */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={15} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder={filter === "pending" ? "Search name or barcode…" : "Search name, barcode or customer…"}
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={15} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, s.tabLeft, filter === "pending" && s.tabActive]}
          onPress={() => { setFilter("pending"); setSearchQuery(""); }}
        >
          <Ionicons name="cart-outline" size={14} color={filter === "pending" ? C.white : C.textSub} />
          <Text style={[s.tabText, filter === "pending" && s.tabTextActive]}>Cart ({pendingCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, filter === "synced" && s.tabActive]}
          onPress={() => { setFilter("synced"); setSearchQuery(""); }}
        >
          <Ionicons name="checkmark-circle-outline" size={14} color={filter === "synced" ? C.white : C.textSub} />
          <Text style={[s.tabText, filter === "synced" && s.tabTextActive]}>Uploaded ({syncedCount})</Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => `${item.type}-${item.id}`}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} tintColor={C.accent} />
          }
        />
      )}

      {/* ── Qty Edit Overlay ── */}
      {editingItem && (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <Text style={s.overlayTitle}>Edit Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setEditQty(v => String(Math.max(1, parseInt(v || "1") - 1)))}>
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={s.qtyInput}
                value={editQty}
                onChangeText={v => setEditQty(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                maxLength={5}
              />
              <TouchableOpacity style={s.qtyBtn} onPress={() => setEditQty(v => String((parseInt(v || "0") || 0) + 1))}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={s.overlayActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingItem(null)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveQty}>
                <Text style={s.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Bluetooth Device Picker Modal ── */}
      <Modal
        visible={showDevicePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDevicePicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Select Printer</Text>
            <Text style={s.modalSub}>{devices.length} paired Bluetooth device(s) found</Text>

            <ScrollView style={{ width: "100%", maxHeight: 300 }}>
              {devices.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.deviceRow}
                  onPress={() => handleConnectAndPrint(d)}
                >
                  <View style={s.deviceIcon}>
                    <Ionicons name="print-outline" size={20} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.deviceName}>{d.device_name || "Unknown Printer"}</Text>
                    <Text style={s.deviceMac}>{d.inner_mac_address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={s.modalCancel} onPress={() => setShowDevicePicker(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={s.footer}>Powered by IMC Business Solutions .V5</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Layout
  container:       { flex: 1, backgroundColor: C.bg },
  listContent:     { padding: 12, paddingBottom: 30 },

  // Header
  header:          { backgroundColor: C.white, paddingTop: 48, paddingBottom: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: C.border },
  headerTopRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  pageTitle:       { fontSize: 16, fontWeight: "700", color: C.text, letterSpacing: 1 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  statusStrip:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 4 },
  statusText:      { fontSize: 11, fontWeight: "500", flex: 1 },

  // Log panel
  logPanel:        { backgroundColor: C.logBg, maxHeight: 180 },
  logPanelHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  logPanelTitle:   { color: "#7dd3fc", fontSize: 12, fontWeight: "600" },
  logClearBtn:     { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: "#1e293b", borderRadius: 4 },
  logClearText:    { color: "#94a3b8", fontSize: 11 },
  logScroll:       { paddingHorizontal: 12, paddingBottom: 8 },
  logLine:         { fontSize: 10, fontFamily: "monospace", marginBottom: 1 },
  logEmpty:        { color: "#475569", fontSize: 11, paddingVertical: 8 },

  // Search
  searchBox:       { flexDirection: "row", alignItems: "center", margin: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput:     { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },

  // Tabs
  tabs:            { flexDirection: "row", marginHorizontal: 12, marginBottom: 8, backgroundColor: C.white, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  tab:             { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, gap: 5 },
  tabLeft:         { borderRightWidth: 1, borderColor: C.border },
  tabActive:       { backgroundColor: C.primary },
  tabText:         { fontSize: 13, fontWeight: "600", color: C.textSub },
  tabTextActive:   { color: C.white },

  // Cards
  card:            { backgroundColor: C.white, borderRadius: 12, marginBottom: 10, padding: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  cardTop:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  cardName:        { fontSize: 14, fontWeight: "700", color: C.text },
  cardBarcode:     { fontSize: 11, color: C.textMuted, marginTop: 2 },
  cardDate:        { fontSize: 11, color: C.textMuted, marginTop: 8 },
  badge:           { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:       { fontSize: 11, fontWeight: "600" },
  manualBadge:     { backgroundColor: "#FEF9C3", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4, alignSelf: "flex-start" },
  manualBadgeText: { fontSize: 10, color: "#92400E", fontWeight: "600" },
  divider:         { height: 1, backgroundColor: C.bg, marginVertical: 8 },
  metaRow:         { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem:        { alignItems: "center", minWidth: 55 },
  metaLabel:       { fontSize: 10, color: C.textMuted, marginBottom: 2 },
  metaValue:       { fontSize: 13, fontWeight: "600", color: C.text },
  editableVal:     { color: C.accent },
  customerRow:     { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 6 },
  customerText:    { fontSize: 12, color: C.text, flex: 1 },

  // Empty state
  emptyWrap:       { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle:      { fontSize: 16, fontWeight: "700", color: C.textSub, marginTop: 12 },
  emptySubtitle:   { fontSize: 13, color: C.textMuted, marginTop: 4 },

  // Loading
  loadingWrap:     { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText:     { color: C.textMuted, marginTop: 10, fontSize: 13 },

  // Qty edit overlay
  overlay:         { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  overlayCard:     { backgroundColor: C.white, borderRadius: 16, padding: 24, width: width * 0.8 },
  overlayTitle:    { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 16, textAlign: "center" },
  qtyRow:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 },
  qtyBtn:          { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  qtyBtnText:      { fontSize: 20, fontWeight: "700", color: C.text },
  qtyInput:        { width: 70, height: 44, borderWidth: 1, borderColor: C.border, borderRadius: 10, textAlign: "center", fontSize: 18, fontWeight: "700", color: C.text },
  overlayActions:  { flexDirection: "row", gap: 10 },
  cancelBtn:       { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: C.bg, alignItems: "center" },
  cancelText:      { fontSize: 14, fontWeight: "600", color: C.textMuted },
  saveBtn:         { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: C.primary, alignItems: "center" },
  saveText:        { fontSize: 14, fontWeight: "600", color: C.white },

  // Modal
  modalOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard:       { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, alignItems: "center" },
  modalTitle:      { fontSize: 17, fontWeight: "700", color: C.text, marginBottom: 4 },
  modalSub:        { fontSize: 13, color: C.textMuted, marginBottom: 16 },
  deviceRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: C.bg, gap: 12, width: "100%" },
  deviceIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accentLt, alignItems: "center", justifyContent: "center" },
  deviceName:      { fontSize: 14, fontWeight: "600", color: C.text },
  deviceMac:       { fontSize: 11, color: C.textMuted },
  modalCancel:     { marginTop: 12, paddingVertical: 13, alignItems: "center", borderRadius: 10, backgroundColor: C.bg, width: "100%" },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: C.textMuted },

  // Footer
  footer:          { textAlign: "center", color: C.textMuted, fontSize: 11, paddingVertical: 8 },
});