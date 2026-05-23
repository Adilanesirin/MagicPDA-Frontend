import { Ionicons } from "@expo/vector-icons";
import { getDatabase, getAllSuppliers } from "@/utils/database";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type TabType = "pending" | "uploaded";

type GRNItem = {
  id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  total: number;
  is_manual_entry: number;
};

type GRNReportData = {
  id: string;
  supplier_code: string;
  supplier_name: string;
  date: string;
  time: string;
  rawDate: string;
  items: GRNItem[];
  grossValue: number;
  totalQuantity: number;
  server_response?: string;
};

const initGRNReportsTable = async () => {
  const db = getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS grn_reports_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_code TEXT NOT NULL,
      barcode TEXT NOT NULL,
      product_name TEXT,
      quantity INTEGER NOT NULL,
      rate REAL NOT NULL,
      mrp REAL NOT NULL,
      grn_date TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      is_manual_entry INTEGER DEFAULT 0,
      server_response TEXT DEFAULT ''
    );
  `);

  try {
    await db.execAsync(
      "ALTER TABLE grn_reports_history ADD COLUMN server_response TEXT DEFAULT ''"
    );
  } catch {
    // Existing installs may already have this column.
  }
};

const copySyncedToHistory = async () => {
  const db = getDatabase();
  const rows = (await db.getAllAsync(`
    SELECT DISTINCT
      supplier_code,
      barcode,
      product_name,
      quantity,
      rate,
      mrp,
      grn_date,
      created_at,
      is_manual_entry
    FROM grn_to_sync
    WHERE sync_status = 'synced'
  `)) as any[];

  for (const row of rows) {
    const exists = await db.getFirstAsync(
      `SELECT id FROM grn_reports_history
       WHERE supplier_code = ? AND barcode = ? AND grn_date = ? AND uploaded_at = ?`,
      [row.supplier_code, row.barcode, row.grn_date, row.created_at]
    );

    if (!exists) {
      await db.runAsync(
        `INSERT INTO grn_reports_history
          (supplier_code, barcode, product_name, quantity, rate, mrp, grn_date, uploaded_at, is_manual_entry)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.supplier_code,
          row.barcode,
          row.product_name || "",
          row.quantity || 0,
          row.rate || 0,
          row.mrp || 0,
          row.grn_date,
          row.created_at,
          row.is_manual_entry || 0,
        ]
      );
    }
  }
};

const toDisplayDate = (value: string) => {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

export default function GRNReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [reports, setReports] = useState<GRNReportData[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<GRNItem | null>(null);
  const [editQuantity, setEditQuantity] = useState("1");
  const [editRate, setEditRate] = useState("0");
  const [editMrp, setEditMrp] = useState("0");

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      await initGRNReportsTable();
      await copySyncedToHistory();

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const minDate = threeDaysAgo.toISOString().split("T")[0];

      const db = getDatabase();
      const rows =
        activeTab === "uploaded"
          ? ((await db.getAllAsync(
              `SELECT id, supplier_code, grn_date, uploaded_at as created_at,
                      product_name, barcode, quantity, rate, mrp,
                      is_manual_entry, server_response
               FROM grn_reports_history
               WHERE grn_date >= ?
               ORDER BY uploaded_at DESC, supplier_code`,
              [minDate]
            )) as any[])
          : ((await db.getAllAsync(
              `SELECT id, supplier_code, grn_date, created_at, product_name,
                      barcode, quantity, rate, mrp, is_manual_entry
               FROM grn_to_sync
               WHERE sync_status = 'pending' AND grn_date >= ?
               ORDER BY created_at DESC, supplier_code`,
              [minDate]
            )) as any[]);

      const suppliers = await getAllSuppliers();
      const supplierMap = new Map<string, string>();
      if (Array.isArray(suppliers)) {
        suppliers.forEach((supplier: any) => {
          if (supplier.code && supplier.name) {
            supplierMap.set(supplier.code, supplier.name);
          }
        });
      }

      const grouped: Record<string, GRNReportData> = {};
      rows.forEach((row) => {
        const rawCreatedAt = row.created_at || row.grn_date || new Date().toISOString();
        const createdDate = new Date(rawCreatedAt);
        const batchKey = Math.floor(createdDate.getTime() / (5 * 60 * 1000));
        const key = `${row.supplier_code}_${row.grn_date}_${batchKey}`;
        const display = toDisplayDate(rawCreatedAt);

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            supplier_code: row.supplier_code,
            supplier_name: supplierMap.get(row.supplier_code) || row.supplier_code,
            date: display.date,
            time: display.time,
            rawDate: row.grn_date,
            items: [],
            grossValue: 0,
            totalQuantity: 0,
            server_response: row.server_response || "",
          };
        }

        const quantity = Number(row.quantity) || 0;
        const rate = Number(row.rate) || 0;
        const mrp = Number(row.mrp) || 0;
        const total = quantity * rate;

        grouped[key].items.push({
          id: row.id,
          product_name: row.product_name || "Unknown Product",
          barcode: row.barcode,
          quantity,
          rate,
          mrp,
          total,
          is_manual_entry: Number(row.is_manual_entry) || 0,
        });
        grouped[key].grossValue += total;
        grouped[key].totalQuantity += quantity;
      });

      setReports(
        Object.values(grouped).sort((a, b) => (a.id < b.id ? 1 : -1))
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load GRN report.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const totalGrossValue = useMemo(
    () => reports.reduce((sum, report) => sum + report.grossValue, 0),
    [reports]
  );

  const toggleReport = (id: string) => {
    setExpandedReports((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEditModal = (item: GRNItem) => {
    setEditingItem(item);
    setEditQuantity(String(item.quantity));
    setEditRate(String(item.rate));
    setEditMrp(String(item.mrp));
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    const quantity = Number(editQuantity) || 0;
    const rate = Number(editRate) || 0;
    const mrp = Number(editMrp) || 0;

    if (quantity <= 0) {
      Alert.alert("Invalid quantity", "Quantity must be greater than zero.");
      return;
    }

    await getDatabase().runAsync(
      "UPDATE grn_to_sync SET quantity = ?, rate = ?, mrp = ? WHERE id = ?",
      [quantity, rate, mrp, editingItem.id]
    );

    closeEditModal();
    await loadReports();
  };

  const deleteItem = (itemId: number) => {
    Alert.alert("Delete Item", "Remove this pending GRN item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await getDatabase().runAsync("DELETE FROM grn_to_sync WHERE id = ?", [
            itemId,
          ]);
          await loadReports();
        },
      },
    ]);
  };

  const lastTapRef = React.useRef(0);
  const handleDoubleTapToRevert = (supplier_code: string, rawDate: string) => {
    if (activeTab !== "uploaded") return;
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      Alert.alert(
        "Revert Upload",
        "Revert this GRN report back to pending so it can be uploaded again?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Revert",
            onPress: async () => {
              try {
                const db = getDatabase();
                await db.runAsync(
                  "UPDATE grn_to_sync SET sync_status = 'pending' WHERE supplier_code = ? AND grn_date = ?",
                  [supplier_code, rawDate]
                );
                await db.runAsync(
                  "DELETE FROM grn_reports_history WHERE supplier_code = ? AND grn_date = ?",
                  [supplier_code, rawDate]
                );
                await loadReports();
              } catch (e: any) {
                Alert.alert("Error", e.message);
              }
            }
          }
        ]
      );
    }
    lastTapRef.current = now;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ae2d97" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>GRN Report</Text>
          <Text style={styles.headerSubtitle}>Pending and uploaded entries</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, styles.tabLeft, activeTab === "pending" && styles.tabActive]}
          onPress={() => {
            setActiveTab("pending");
            setExpandedReports(new Set());
          }}
        >
          <Ionicons
            name="cart-outline"
            size={17}
            color={activeTab === "pending" ? "#FFFFFF" : "#6B7280"}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "uploaded" && styles.tabActive]}
          onPress={() => {
            setActiveTab("uploaded");
            setExpandedReports(new Set());
          }}
        >
          <Ionicons
            name="cloud-done-outline"
            size={17}
            color={activeTab === "uploaded" ? "#FFFFFF" : "#6B7280"}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === "uploaded" && styles.tabTextActive]}>
            Uploaded
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ae2d97" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      ) : (
        <>
          {reports.length > 0 && (
            <View style={styles.totalCard}>
              <View style={styles.totalIconContainer}>
                <Ionicons name="wallet" size={28} color="#059669" />
              </View>
              <View style={styles.totalTextContainer}>
                <Text style={styles.totalLabel}>
                  {activeTab === "pending" ? "Total Pending Value" : "Total Uploaded Value"}
                </Text>
                <Text style={styles.totalValue}>
                  {totalGrossValue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {reports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                  <Ionicons
                    name={activeTab === "pending" ? "cart-outline" : "cloud-upload-outline"}
                    size={48}
                    color="#9CA3AF"
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeTab === "pending" ? "No Pending Items" : "No Uploaded Reports"}
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === "pending"
                    ? "No GRN items are waiting to be uploaded."
                    : "No GRN data has been uploaded in the last 3 days."}
                </Text>
              </View>
            ) : (
              reports.map((report) => {
                const isExpanded = expandedReports.has(report.id);
                return (
                  <View key={report.id} style={styles.reportCard}>
                    <TouchableOpacity 
                      activeOpacity={0.8} 
                      style={styles.supplierSection}
                      onPress={() => handleDoubleTapToRevert(report.supplier_code, report.rawDate)}
                    >
                      <View style={styles.supplierHeader}>
                        <View style={styles.supplierIconBg}>
                          <Ionicons name="business" size={16} color="#FFFFFF" />
                        </View>
                        <View style={styles.supplierInfo}>
                          <Text style={styles.supplierName} numberOfLines={1}>
                            {report.supplier_name}
                          </Text>
                          <View style={styles.dateTimeRow}>
                            <Text style={styles.dateTimeText}>{report.date}</Text>
                            <View style={styles.dateDivider} />
                            <Text style={styles.dateTimeText}>{report.time}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.statsSection}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Value</Text>
                        <Text style={[styles.statValue, styles.grossValue]}>
                          {report.grossValue.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Qty</Text>
                        <Text style={[styles.statValue, styles.quantityValue]}>
                          {report.totalQuantity}
                        </Text>
                      </View>
                    </View>

                    {activeTab === "uploaded" && (
                      <View style={styles.serverResponse}>
                        <Text style={styles.serverResponseTitle}>Server Response</Text>
                        <Text style={styles.serverResponseText} selectable>
                          {report.server_response?.trim() || "No server response stored."}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => toggleReport(report.id)}
                      style={styles.dropdownButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownText}>
                        {isExpanded ? "Hide" : "View"} Items ({report.items.length})
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color="#6366F1"
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.itemsSection}>
                        {report.items.map((item, index) => (
                          <View key={`${item.id}_${index}`} style={styles.itemRow}>
                            <View style={styles.itemColorBar} />
                            <View style={styles.itemContent}>
                              <View style={styles.itemHeaderRow}>
                                <View style={styles.itemNameContainer}>
                                  <Text style={styles.itemName} numberOfLines={1}>
                                    {item.product_name}
                                  </Text>
                                  {item.is_manual_entry === 1 && (
                                    <View style={styles.manualBadge}>
                                      <Text style={styles.manualBadgeText}>M</Text>
                                    </View>
                                  )}
                                </View>
                                {activeTab === "pending" && (
                                  <View style={styles.itemActions}>
                                    <TouchableOpacity
                                      onPress={() => openEditModal(item)}
                                      style={styles.editButton}
                                    >
                                      <Ionicons
                                        name="create-outline"
                                        size={16}
                                        color="#3B82F6"
                                      />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => deleteItem(item.id)}
                                      style={styles.deleteButton}
                                    >
                                      <Ionicons
                                        name="trash-outline"
                                        size={16}
                                        color="#EF4444"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.itemBarcode}>{item.barcode}</Text>
                              <Text style={styles.itemMrp}>MRP: {item.mrp.toFixed(2)}</Text>
                              <View style={styles.itemDetailsRow}>
                                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                                <Text style={styles.itemRate}>Cost: {item.rate.toFixed(2)}</Text>
                                <Text style={styles.itemTotal}>
                                  = {item.total.toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={!!editingItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit GRN Item</Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.productName} numberOfLines={2}>
              {editingItem?.product_name}
            </Text>
            <Text style={styles.productBarcode}>{editingItem?.barcode}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Quantity</Text>
              <TextInput
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
                style={styles.textInput}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cost</Text>
              <TextInput
                value={editRate}
                onChangeText={setEditRate}
                keyboardType="decimal-pad"
                style={styles.textInput}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>MRP</Text>
              <TextInput
                value={editMrp}
                onChangeText={setEditMrp}
                keyboardType="decimal-pad"
                style={styles.textInput}
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                onPress={closeEditModal}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f8" },
  header: {
    backgroundColor: "#ae2d97",
    paddingTop: Platform.OS === "android" ? 40 : 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: { flex: 1, marginLeft: 12, alignItems: "center" },
  headerTitle: { fontSize: 23, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 12, color: "#FFFFFF", marginTop: 1 },
  headerSpacer: { width: 34 },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabLeft: { borderRightWidth: 1, borderRightColor: "#E5E7EB" },
  tabActive: { backgroundColor: "#ae2d97" },
  tabIcon: { marginRight: 6 },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "700" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 15, color: "#6B7280" },
  totalCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 14,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  totalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d3f6e4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  totalTextContainer: { flex: 1 },
  totalLabel: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
    marginBottom: 2,
  },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#047857" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 14, gap: 10 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 16,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#edeef1",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#374151" },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  supplierSection: {
    backgroundColor: "#f5ecfa",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f6b1ca",
  },
  supplierHeader: { flexDirection: "row", alignItems: "center" },
  supplierIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ce092d",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  supplierInfo: { flex: 1 },
  supplierName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#a80c3d",
    marginBottom: 3,
  },
  dateTimeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#b61174",
  },
  dateTimeText: { fontSize: 13, color: "#a90dac", fontWeight: "500" },
  statsSection: { flexDirection: "row", padding: 12 },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "#fe8df5" },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statValue: { fontSize: 18, fontWeight: "900" },
  grossValue: { color: "#1a27d1" },
  quantityValue: { color: "#ab136c" },
  serverResponse: {
    backgroundColor: "#1a1a2e",
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    padding: 10,
  },
  serverResponseTitle: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  serverResponseText: { color: "#e2e8f0", fontSize: 11 },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e6c7ce2a",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c92f8955",
  },
  dropdownText: { fontSize: 12, fontWeight: "600", color: "#170c52" },
  itemsSection: { gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  itemRow: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemColorBar: { width: 3, backgroundColor: "#10B981" },
  itemContent: { flex: 1, padding: 8 },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 4,
  },
  itemNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    lineHeight: 18,
  },
  itemActions: { flexDirection: "row", gap: 8 },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  manualBadge: {
    backgroundColor: "#3B82F6",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  manualBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  itemBarcode: { fontSize: 11, color: "#9d8a9b", marginBottom: 2 },
  itemMrp: {
    fontSize: 11,
    color: "#3448e2",
    fontWeight: "900",
    marginBottom: 4,
  },
  itemDetailsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  itemQty: { fontSize: 11, color: "#ff7373", fontWeight: "900" },
  itemRate: { fontSize: 11, color: "#ff7373", fontWeight: "900" },
  itemTotal: { fontSize: 11, color: "#1e9532", fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1f2937", flex: 1 },
  modalCloseButton: { padding: 4 },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
    textAlign: "center",
  },
  productBarcode: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  formGroup: { marginBottom: 16 },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  modalButtonContainer: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  saveButton: { backgroundColor: "#ec4899" },
  cancelButtonText: { color: "#374151", fontSize: 16, fontWeight: "600" },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
