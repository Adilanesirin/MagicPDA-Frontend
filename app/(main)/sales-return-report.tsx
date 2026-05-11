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
    View,
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
  primary:   "#C2410C",   // dark orange (was #131f3d)
  accent:    "#EA580C",   // main orange (was #43b1d6)
  accentLt:  "#FFF7ED",   // light orange bg (was #EFF9FD)
  bg:        "#f9f6f3",   // warm off-white bg (was #F1F5F9)
  white:     "#FFFFFF",
  border:    "#e5ddda",   // warm border (was #E2E8F0)
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
export default function SalesReturnReportScreen() {
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

  // Wire global logger to local state
  useEffect(() => {
    _setLogs = setLogs;
    return () => { _setLogs = null; };
  }, []);

  // Load native printer module on mount
  useEffect(() => {
    plog("INFO", "Initialising BLE printer module…");

    const allKeys = Object.keys(NativeModules);
    const bleKeys = allKeys.filter(k =>
      k.toLowerCase().includes("print") ||
      k.toLowerCase().includes("ble")   ||
      k.toLowerCase().includes("bluetooth") ||
      k.toLowerCase().includes("thermal")
    );
    plog("INFO", `Total NativeModules: ${allKeys.length}`);
    plog("INFO", `BLE/Print modules: ${bleKeys.length > 0 ? bleKeys.join(", ") : "NONE FOUND"}`);

    // ✅ Check BEFORE require() — the library throws at load time (NativeEventEmitter)
    //    when the native module is absent, so try/catch alone is not enough.
    if (!NativeModules.RNBLEPrinter) {
      plog("ERROR", "RNBLEPrinter NOT in NativeModules ❌");
      plog("WARN", "You are running in Expo Go — BLE native module is NOT bundled");
      plog("WARN", "Fix: npx expo prebuild  →  npx expo run:android");
      setPrinterReady(false);
      return;
    }

    try {
      const lib = require("react-native-thermal-receipt-printer");
      plog("INFO", "require() succeeded");
      plog("OK", "RNBLEPrinter native module found ✅");
      BLERef.current = lib.BLEPrinter;
      const methods = Object.keys(lib.BLEPrinter || {});
      plog("INFO", `BLEPrinter methods: ${methods.join(", ")}`);
      setPrinterReady(true);
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
      const pc = await db.getFirstAsync("SELECT COUNT(*) as count FROM pending_sales_return_items") as { count: number } | null;
      const sc = await db.getFirstAsync("SELECT COUNT(*) as count FROM sales_return_to_sync WHERE sync_status = 'synced'") as { count: number } | null;
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
           FROM pending_sales_return_items ORDER BY scannedAt DESC`
        ) as any[];
        setItems((rows || []).map(r => ({ ...r, type: "pending" as const })));
      } else {
        const rows = await db.getAllAsync(
          `SELECT id, barcode, COALESCE(product_name, barcode) as name,
            quantity, COALESCE(rate,0) as rate, COALESCE(mrp,0) as mrp,
            COALESCE(sale_date,'') as sale_date, COALESCE(created_at,'') as created_at,
            COALESCE(customer,'') as customer, COALESCE(enclosures,'') as enclosures,
            COALESCE(is_manual_entry,0) as is_manual_entry
           FROM sales_return_to_sync WHERE sync_status = 'synced' ORDER BY created_at DESC`
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
    const table = filter === "pending" ? "pending_sales_return_items" : "sales_return_to_sync";
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

  // Center text for 32-char thermal paper
  const center = (text: string, w = 32) => {
    const pad = Math.max(0, Math.floor((w - text.length) / 2));
    return " ".repeat(pad) + text;
  };

  const buildReceipt = (): string => {
    const SEP = "================================";
    const DIV = "--------------------------------";
    const now = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

    const lines: string[] = [
      center("IMC BUSINESS SOLUTIONS"),
      center("PALAKUNNUMMAL BUILDINGS"),
      center("KALPETTA, WAYANAD - 673121"),
      center("Ph: 9946545535"),
      SEP,
      center(filter === "pending" ? "RETURN CART" : "RETURN BILL"),
      center(`Date: ${now}`),
      SEP,
      "",
    ];

    if (filteredItems.length === 0) {
      lines.push(center("No items to print"));
    } else {
      filteredItems.forEach((item, idx) => {
        if (item.type === "pending") {
          const p = item as PendingItem & { type: "pending" };
          lines.push(`${idx + 1}. ${(p.name || "Unknown").slice(0, 28)}`);
          lines.push(`   ${p.barcode}`);
          lines.push(`   Qty: ${p.quantity}   MRP: Rs.${p.bmrp}   Price: Rs.${p.S1}`);
          if (p.currentStock !== undefined) lines.push(`   Stock: ${p.currentStock}`);
        } else {
          const s = item as SyncedItem & { type: "synced" };
          const parts = (s.customer || "").split("|");
          const custName  = parts[0]?.trim() || "";
          const custPhone = parts[1]?.trim() || s.enclosures?.trim() || "";
          lines.push(`${idx + 1}. ${(s.name || "Unknown").slice(0, 28)}`);
          lines.push(`   ${s.barcode}`);
          lines.push(`   Qty: ${s.quantity}   Rate: Rs.${s.rate}   MRP: Rs.${s.mrp}`);
          if (custName)  lines.push(`   Customer: ${custName}`);
          if (custPhone) lines.push(`   Phone   : ${custPhone}`);
        }
        if (idx < filteredItems.length - 1) lines.push(DIV);
      });
    }

    lines.push("", SEP, center(`Total Items: ${filteredItems.length}`), SEP);
    lines.push(center("Thank You!"), center("Powered by IMC Business Solutions"), "\n\n\n");

    const result = lines.join("\n");

    if (result.length > 4000) {
      plog("WARN", `Receipt too large (${result.length} chars), truncating…`);
      return result.slice(0, 4000) + "\n\nTRUNCATED\n\n\n";
    }

    return result;
  };

  // Request Bluetooth permissions
  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;
    try {
      if (Platform.Version >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        plog("INFO", `Permissions response: ${JSON.stringify(results)}`);
        const allGranted = Object.values(results).every(
          r => r === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!allGranted) {
          plog("WARN", "Bluetooth permissions not granted: " + JSON.stringify(results));
          Alert.alert(
            "Permission Denied",
            "Bluetooth permissions are required to scan for printers.\n\nGo to Settings → Apps → IMCSync → Permissions → Allow 'Nearby devices'."
          );
          return false;
        }
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          plog("WARN", "Location permission denied (needed for BLE on Android ≤11)");
          Alert.alert(
            "Permission Denied",
            "Location permission is required for Bluetooth scanning on this device."
          );
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

  // Step 1: Init and scan for paired BLE devices
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
        Alert.alert(
          "No Printers Found",
          "Make sure your thermal printer is:\n1. Turned ON\n2. Paired in Android Settings → Bluetooth\n\nThen tap the print button again."
        );
        return;
      }

      list.forEach((d, i) =>
        plog("INFO", `  [${i}] name="${d.device_name}" mac="${d.inner_mac_address}"`)
      );
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

  // Step 2: Connect to chosen device and print
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

  // Print button handler — reuse connected device or scan fresh
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
        <View style={[s.badge, { backgroundColor: "#FFF7ED" }]}>
          <Text style={[s.badgeText, { color: C.accent }]}>In Cart</Text>
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
      <Text style={s.emptyTitle}>{filter === "synced" ? "No Synced Returns" : "Return Cart is Empty"}</Text>
      <Text style={s.emptySubtitle}>
        {filter === "synced" ? "Uploaded returns will appear here." : "No return items in cart yet."}
      </Text>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f6f3" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>

          <Text style={s.pageTitle}>RETURN REPORT</Text>

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setShowLogs(v => !v)}
              style={[s.iconBtn, showLogs && { backgroundColor: C.accent }]}
            >
              <Ionicons name="terminal-outline" size={18} color={showLogs ? C.white : "#ffffff"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleQuickPrint}
              disabled={printing || scanning}
              style={[s.iconBtn, (printing || scanning) && { opacity: 0.5 }]}
            >
              {printing || scanning
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <Ionicons name="print-outline" size={20} color="#ffffff" />
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
// STYLES — Same structure as sales-report, orange colour palette from sales-return
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingTop: Platform.OS === "android" ? 55 : 60,
    paddingHorizontal: 16,
    backgroundColor: "#f9f6f3",
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  iconBtn: {
    backgroundColor: "#C2410C",   // dark orange (was #1E293B dark navy)
    borderRadius: 20, padding: 8,
    justifyContent: "center", alignItems: "center",
  },
  pageTitle: { fontSize: 20, fontWeight: "900", color: "#EA580C", letterSpacing: 0.3 },

  statusStrip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 2,
  },
  statusText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },

  logPanel: {
    backgroundColor: C.logBg, maxHeight: 200,
    borderBottomWidth: 1, borderBottomColor: "#1e293b",
  },
  logPanelHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: "#1e293b",
  },
  logPanelTitle: {
    color: "#e2e8f0", fontSize: 12, fontWeight: "700",
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
  },
  logClearBtn: { backgroundColor: "#1e293b", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  logClearText: { color: "#64748b", fontSize: 11 },
  logScroll: { paddingHorizontal: 12, paddingVertical: 6 },
  logEmpty: { color: "#475569", fontSize: 12, fontStyle: "italic" },
  logLine: {
    fontSize: 10.5, marginBottom: 2, lineHeight: 15,
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
  },

  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.white,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 0 },

  tabs: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 10, marginBottom: 6,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white, overflow: "hidden",
  },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11, gap: 6, backgroundColor: C.white },
  tabLeft: { borderRightWidth: 1, borderRightColor: C.border },
  tabActive: { backgroundColor: C.accent },          // orange active tab (was navy)
  tabText: { fontSize: 13, fontWeight: "600", color: C.textSub },
  tabTextActive: { color: C.white },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, flexGrow: 1 },

  card: {
    backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardName: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  cardBarcode: { fontSize: 12, color: C.textMuted },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  manualBadge: { alignSelf: "flex-start", backgroundColor: "#e95e0e", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  manualBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  customerText: { fontSize: 12, color: C.textSub, fontWeight: "500" },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 10 },
  metaRow: { flexDirection: "row", gap: 20, flexWrap: "wrap", marginBottom: 6 },
  metaItem: {},
  metaLabel: { fontSize: 11, color: C.textMuted, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: "700", color: C.text },
  editableVal: { color: C.accent, textDecorationLine: "underline" },   // orange underline
  cardDate: { fontSize: 11, color: C.textMuted },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: C.textSub, marginTop: 14, marginBottom: 5 },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", paddingHorizontal: 32 },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 14, color: C.textMuted },

  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", zIndex: 999,
  },
  overlayCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 24, width: 270, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  overlayTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 20 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentLt, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: C.accent },
  qtyBtnText: { fontSize: 22, fontWeight: "700", color: C.accent },
  qtyInput: { width: 76, textAlign: "center", fontSize: 22, fontWeight: "800", color: C.text, borderBottomWidth: 2, borderBottomColor: C.accent, paddingVertical: 4 },
  overlayActions: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: C.textSub },
  saveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.accent, alignItems: "center" },
  saveText: { fontSize: 14, fontWeight: "700", color: C.white },

  // Device picker bottom sheet
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: 4 },
  modalSub: { fontSize: 12, color: C.textMuted, marginBottom: 16 },
  deviceRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, width: "100%",
  },
  deviceIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentLt,
    justifyContent: "center", alignItems: "center",
  },
  deviceName: { fontSize: 14, fontWeight: "700", color: C.text },
  deviceMac: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  modalCancel: {
    marginTop: 16, paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
  },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: C.textSub },

  footer: {
    textAlign: "center", color: C.textMuted, fontSize: width * 0.03,
    paddingBottom: Platform.OS === "android" ? 24 : 34, marginTop: 8, fontWeight: "400",
  },
});