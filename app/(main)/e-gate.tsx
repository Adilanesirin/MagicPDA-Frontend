import { createEnhancedAPI } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

type VerificationResult = {
  id: string;
  status: "success" | "already_billed" | "error";
  detail: string;
  type?: string;
  billno?: string | number;
  ft?: string;
  scannedValue: string;
  timestamp: number;
};

const getApiErrorDetail = (data: unknown, httpStatus?: number) => {
  const isHtml = typeof data === "string" && /<\s*html|<!doctype/i.test(data);

  if (typeof data === "string" && data.trim() && !isHtml) return data;

  if (data && typeof data === "object") {
    const response = data as Record<string, unknown>;
    const detail = response.detail ?? response.message ?? response.error ?? response.errors;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) return detail.map((item) => String(item?.msg ?? item)).join(", ");
  }

  if (isHtml) return "The server route wasn't found — check that the E-Gate endpoint URL and server address are correct.";
  if (httpStatus === 401) return "Your session has expired or is not valid. Please sign in again.";
  if (httpStatus === 404) return "No matching invoice was found.";
  if (httpStatus === 400) return "The server rejected this invoice barcode.";
  return httpStatus ? `Server request failed (HTTP ${httpStatus}).` : "Cannot connect to the server. Check your network and try again.";
};

// Per the API docs, E-Gate billing lives on the SAME server as login
// (both examples use the same host:port). There's no separate E-Gate
// machine to pair with — it reuses the already-paired server + token.
export default function EGateScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [billNumber, setBillNumber] = useState("");
  const [hardwareScanValue, setHardwareScanValue] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [pairedHost, setPairedHost] = useState<string | null>(null);
  const scanLockRef = useRef(false);
const hardwareInputRef = useRef<TextInput>(null);
const scannedValuesRef = useRef<Set<string>>(new Set());
const manualInputFocusedRef = useRef(false);

  // Fire on the hardware/device scan value immediately (no debounce).
  useEffect(() => {
    if (showScanner) return;
    if (hardwareScanValue.trim().length > 0) {
      const value = hardwareScanValue.trim();
      setHardwareScanValue("");
      handleScannedBill(value);
    }
  }, [hardwareScanValue, showScanner]);

  // Keep the hidden input focused with a persistent interval.
useEffect(() => {
  if (showScanner) return;
  const interval = setInterval(() => {
    if (!manualInputFocusedRef.current) {
      hardwareInputRef.current?.focus();
    }
  }, 1000);
  return () => clearInterval(interval);
}, [showScanner]);

  // Load the paired server (the same one used for login) on mount. If
  // nothing is paired yet, send the user to pairing instead of letting
  // them scan against nothing.
  useEffect(() => {
    (async () => {
      const ip = await SecureStore.getItemAsync("paired_ip");
      if (ip) {
        setPairedHost(ip);
      } else {
        Alert.alert(
          "Server not connected",
          "Connect to your server first to use E-Gate.",
          [{ text: "Go to pairing", onPress: () => router.replace("/(auth)/pairing") }]
        );
      }
    })();
  }, []);

  const closeScanner = () => {
    setShowScanner(false);
    setScanned(false);
    scanLockRef.current = false;
  };

  const handleScannedBill = (data: string) => {
  if (scanLockRef.current) return;

  const cleanValue = data.trim();
  if (!cleanValue) return;

  scanLockRef.current = true;
  setScanned(true);
  setBillNumber(cleanValue);
  setShowScanner(false);

  // Scanning only fills the field. It NEVER calls the API — that only
  // happens when the guard reviews the number and taps "Verify".
  // (The dedupe check now lives inside verifyBill, so it only triggers
  // on an actual verify attempt.)

  setTimeout(() => {
    setScanned(false);
    scanLockRef.current = false;
  }, 300);
};

  const openCamera = async () => {
    if (!permission?.granted) {
      const requested = await requestPermission();
      if (!requested.granted) {
        Alert.alert("Camera permission needed", "Allow camera access to scan invoice barcodes.");
        return;
      }
    }

    setShowScanner(true);
  };

  const startDeviceScanner = () => {
    hardwareInputRef.current?.focus();
    Alert.alert(
      "Device Scanner Ready",
      "Scan the invoice using the Zebra hardware scanner.",
      [{ text: "OK", onPress: () => setTimeout(() => hardwareInputRef.current?.focus(), 100) }],
      { onDismiss: () => setTimeout(() => hardwareInputRef.current?.focus(), 100) }
    );
  };

const BILL_FORMAT = /^[A-Za-z]+-\d+$/; // matches API's documented TYPE-NUMBER rule, e.g. "A-1"


const verifyBill = async (scannedBillNumber?: string) => {
  Keyboard.dismiss(); // always drop the keyboard the moment Verify starts

  const cleanBillNumber = (scannedBillNumber ?? billNumber).replace(/\s+/g, "");
  if (!cleanBillNumber) {
    Alert.alert("No invoice entered", "Scan or type an invoice number before verifying.");
    return;
  }

  if (!BILL_FORMAT.test(cleanBillNumber)) {
    Alert.alert(
      "Invalid bill format",
      `Bill number must be TYPE-NUMBER, e.g. "A-1". You entered "${cleanBillNumber}".`
    );
    return;
  }

  // Moved here from handleScannedBill: only block on dedupe when the
  // guard actually presses Verify, not the instant something is scanned.
  if (scannedValuesRef.current.has(cleanBillNumber)) {
    setResults((prev) => [
      {
        id: `${cleanBillNumber}-${Date.now()}`,
        status: "already_billed",
        detail: "Already verified in this session",
        scannedValue: cleanBillNumber,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
    setBillNumber("");
    return;
  }

  setIsVerifying(true);

    try {
      if (!pairedHost) {
        setResults((prev) => [
          {
            id: `${cleanBillNumber}-${Date.now()}`,
            status: "error",
            detail: "Not connected to a server. Please pair with your server first.",
            scannedValue: cleanBillNumber,
            timestamp: Date.now(),
          },
          ...prev,
        ]);
        router.replace("/(auth)/pairing");
        return;
      }

      // createEnhancedAPI() already targets http://{paired_ip}:8000 and
      // attaches "Authorization: Bearer <token>" from the login step, so
      // this is a plain relative call to the documented endpoint.
      const api = await createEnhancedAPI();
const response = await api.post("/e-gate-billing", { billno: cleanBillNumber });
const data = response.data ?? {};

let entry: VerificationResult;
if (data.status === "success") {
  scannedValuesRef.current.add(cleanBillNumber); // only lock it once actually billed
  entry = {
    id: `${cleanBillNumber}-${Date.now()}`,
    status: "success",
    detail: data.detail || "E-Gate billed successfully",
    type: data.type,
    billno: data.billno,
    ft: data.ft,
    scannedValue: cleanBillNumber,
    timestamp: Date.now(),
  };
} else if (data.status === "already_billed" || (response.status === 400 && /already/i.test(data.detail || data.message || ""))) {
  scannedValuesRef.current.add(cleanBillNumber); // genuinely already billed server-side
  entry = {
    id: `${cleanBillNumber}-${Date.now()}`,
    status: "already_billed",
    detail: data.detail || data.message || "Already billed",
    type: data.type,
    billno: data.billno,
    ft: data.ft,
    scannedValue: cleanBillNumber,
    timestamp: Date.now(),
  };
} else {
  // 404 / 400 (bad format) / 401 / 500 — NOT added to the dedupe set,
  // so the guard can retry the same number after fixing the issue.
  entry = {
    id: `${cleanBillNumber}-${Date.now()}`,
    status: "error",
    detail: getApiErrorDetail(data, response.status),
    scannedValue: cleanBillNumber,
    timestamp: Date.now(),
  };
}
          setResults((prev) => [entry, ...prev]);
      setBillNumber("");

      // Guaranteed, impossible-to-miss feedback — not just a list card.
      Alert.alert(
        entry.status === "success" ? "✅ Verified" : entry.status === "already_billed" ? "⚠️ Already Billed" : "❌ Failed",
        entry.detail
      );
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data ?? {};
      const detail = getApiErrorDetail(data, status);
      const isAlreadyBilled = data.status === "already_billed";

      if (isAlreadyBilled) scannedValuesRef.current.add(cleanBillNumber);

            setResults((prev) => [
        {
          id: `${cleanBillNumber}-${Date.now()}`,
          status: isAlreadyBilled ? "already_billed" : "error",
          detail,
          type: data.type,
          billno: data.billno,
          ft: data.ft,
          scannedValue: cleanBillNumber,
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      Alert.alert(isAlreadyBilled ? "⚠️ Already Billed" : "❌ Failed", detail);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderResult = ({ item }: { item: VerificationResult }) => {
    const cardStyle =
      item.status === "success"
        ? styles.successResult
        : item.status === "already_billed"
          ? styles.alreadyBilledResult
          : styles.errorResult;
    const iconName =
      item.status === "success"
        ? "checkmark-circle"
        : item.status === "already_billed"
          ? "information-circle"
          : "alert-circle";
    const iconColor =
      item.status === "success" ? "#15803D" : item.status === "already_billed" ? "#B45309" : "#B91C1C";
    const title =
      item.status === "success" ? "Verified" : item.status === "already_billed" ? "Already Scanned" : "Verification Failed";

    return (
      <View style={[styles.resultCard, cardStyle]}>
        <Ionicons name={iconName} size={26} color={iconColor} />
        <View style={styles.resultTextWrap}>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultText}>{item.detail}</Text>
          <Text style={styles.resultInvoice}>
            Invoice: {item.type ? `${item.type}-` : ""}{item.billno ?? item.scannedValue}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar backgroundColor="#0369A1" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>E-GATE</Text>
          <Text style={styles.headerSubtitle}>Invoice verification</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/(auth)/pairing")}
        >
          <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={26} color="#0369A1" />
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Scan or enter invoice number</Text>
            <Text style={styles.infoText}>Each entry is verified and added to the list below.</Text>
            <Text style={styles.infoHost}>
              {pairedHost ? `Server: ${pairedHost}` : "Not connected — tap the settings icon to pair"}
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.inputLabel}>Invoice number</Text>
        <TextInput
          value={billNumber}
          onChangeText={setBillNumber}
          placeholder='e.g. A-1'
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.billInput}
          onSubmitEditing={() => verifyBill()}
          returnKeyType="done"
          onFocus={() => { manualInputFocusedRef.current = true; }}
          onBlur={() => { manualInputFocusedRef.current = false; }}
        />
        </View>

        <View style={styles.scannerActions}>
          <TouchableOpacity style={styles.deviceScannerButton} onPress={startDeviceScanner}>
            <Ionicons name="hardware-chip-outline" size={20} color="#075985" />
            <Text style={styles.deviceScannerText}>Device Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraScannerButton} onPress={openCamera}>
            <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
            <Text style={styles.cameraScannerText}>Camera Scanner</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, (!billNumber.trim() || isVerifying) && styles.verifyButtonDisabled]}
          onPress={() => verifyBill()}
          disabled={!billNumber.trim() || isVerifying}
        >
          {isVerifying ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />}
          <Text style={styles.verifyButtonText}>{isVerifying ? "Verifying..." : "Verify"}</Text>
        </TouchableOpacity>

        <Text style={styles.listHeader}>Scanned ({results.length})</Text>

        {results.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyWrap}>
            <Text style={styles.emptyText}>No invoices scanned yet.</Text>
          </ScrollView>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderResult}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {!showScanner && (
       <TextInput
          ref={hardwareInputRef}
          autoFocus
          value={hardwareScanValue}
          onChangeText={setHardwareScanValue}
          showSoftInputOnFocus={false}
          blurOnSubmit={false}
          style={styles.hiddenScannerInput}
          caretHidden
          onBlur={() => {
            setTimeout(() => {
              if (!showScanner && !manualInputFocusedRef.current) hardwareInputRef.current?.focus();
            }, 300);
          }}
        />
      )}

      <Modal visible={showScanner} animationType="slide" onRequestClose={closeScanner}>
        <View style={styles.cameraScreen}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : ({ data }) => handleScannedBill(data)}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "code93", "itf14"] }}
          />
          <View style={styles.cameraOverlay}>
              <TouchableOpacity style={styles.closeCameraButton} onPress={closeScanner}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.scanFrame} />
              <Text style={styles.cameraHint}>Align the invoice barcode within the frame</Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { backgroundColor: "#0369A1", paddingTop: Platform.OS === "android" ? 52 : 58, paddingBottom: 22, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  settingsButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 23, fontWeight: "800", letterSpacing: 1 },
  headerSubtitle: { color: "#D7EEFF", fontSize: 13, marginTop: 2 },
  content: { flex: 1, padding: 20, gap: 14 },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, backgroundColor: "#E0F2FE", borderWidth: 1, borderColor: "#BAE6FD" },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: "700", color: "#0C4A6E", marginBottom: 3 },
  infoText: { fontSize: 13, color: "#075985", lineHeight: 18 },
  infoHost: { fontSize: 12, color: "#0369A1", fontWeight: "700", marginTop: 6 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 },
  billInput: { borderWidth: 1, borderColor: "#7DD3FC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", backgroundColor: "#FFFFFF" },
  scannerActions: { flexDirection: "row", gap: 10 },
  deviceScannerButton: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: "#E0F2FE", borderWidth: 1, borderColor: "#7DD3FC" },
  deviceScannerText: { color: "#075985", fontWeight: "700", fontSize: 13 },
  cameraScannerButton: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: "#0284C7" },
  cameraScannerText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  verifyButton: { height: 54, borderRadius: 12, backgroundColor: "#0369A1", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9 },
  verifyButtonDisabled: { backgroundColor: "#94A3B8" },
  verifyButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  listHeader: { fontSize: 15, fontWeight: "700", color: "#334155" },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 30 },
  emptyText: { color: "#94A3B8", fontStyle: "italic", fontSize: 14 },
  resultCard: { marginBottom: 10, padding: 16, borderRadius: 14, flexDirection: "row", gap: 12, borderWidth: 1 },
  successResult: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" },
  alreadyBilledResult: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  errorResult: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  resultTextWrap: { flex: 1 },
  resultTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800", marginBottom: 3 },
  resultText: { color: "#475569", lineHeight: 19, fontSize: 14 },
  resultInvoice: { color: "#334155", fontSize: 13, fontWeight: "700", marginTop: 7 },
  hiddenScannerInput: { position: "absolute", opacity: 0, width: 1, height: 1, bottom: 0 },
  cameraScreen: { flex: 1, backgroundColor: "#000000" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)" },
  closeCameraButton: { position: "absolute", top: Platform.OS === "android" ? 50 : 60, right: 22, width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  scanFrame: { width: "78%", height: 190, borderWidth: 3, borderColor: "#FFFFFF", borderRadius: 16 },
  cameraHint: { position: "absolute", bottom: 100, color: "#FFFFFF", fontWeight: "600", fontSize: 15, textAlign: "center", paddingHorizontal: 24 },
});