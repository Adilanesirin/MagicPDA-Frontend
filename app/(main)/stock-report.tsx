// app/(main)/stock-report.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");
const db = SQLite.openDatabaseSync("magicpedia.db");

// ── same theme as stock-barcode ──────────────────────────────────────────────
const C = {
  primary:   "#0891B2",
  primaryLt: "#ECFEFF",
  accent:    "#06B6D4",
  bg:        "#F8FAFC",
  white:     "#FFFFFF",
  border:    "#E2E8F0",
  text:      "#0F172A",
  textSub:   "#64748B",
  textMuted: "#94A3B8",
};

type FilterType = "synced" | "unsynced";

interface ReportItem {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  created_at: string;
  status: "synced" | "unsynced";
  rate?: number;
  mrp?: number;
}

export default function StockReportScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("unsynced");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncedCount, setSyncedCount] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [editingItem, setEditingItem] = useState<{ id: number; qty: number } | null>(null);
  const [editQty, setEditQty] = useState("");

  useEffect(() => { loadData(); }, [filter]);
  useEffect(() => { applySearch(); }, [searchQuery, items]);

  const applySearch = () => {
    if (!searchQuery.trim()) { setFilteredItems(items); return; }
    const q = searchQuery.toLowerCase();
    setFilteredItems(
      items.filter(
        (i) =>
          (i.barcode || "").toLowerCase().includes(q) ||
          (i.name || "").toLowerCase().includes(q)
      )
    );
  };

  const cleanupOldRecords = async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      await db.runAsync(
     "DELETE FROM stock_count_to_sync WHERE created_at < ? AND sync_status = 'synced'",
        [cutoff.toISOString()]
      );
    } catch (e) { console.error("[CLEANUP]", e); }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // counts for tab labels
      const uc = (await db.getFirstAsync(
"SELECT COUNT(*) as count FROM stock_count_to_sync WHERE sync_status = 'pending'"
      )) as { count: number } | null;
      const sc = (await db.getFirstAsync(
"SELECT COUNT(*) as count FROM stock_count_to_sync WHERE sync_status = 'synced'"
      )) as { count: number } | null;
      setUnsyncedCount(uc?.count || 0);
      setSyncedCount(sc?.count || 0);

      // rows for selected tab
      const statusVal = filter === "unsynced" ? "pending" : "synced";
      const rows = await db.getAllAsync(
        `SELECT id, barcode, COALESCE(product_name, barcode) as name,
        quantity, rate, mrp, created_at
        FROM stock_count_to_sync
        WHERE sync_status = ?
        ORDER BY created_at DESC`,
        [statusVal]
      ) as any[];

      setItems(
        (rows || []).map((r) => ({
          ...r,
          status: filter,
        }))
      );
    } catch (e) {
      console.error("[LOAD]", e);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cleanupOldRecords();
    loadData();
  };

  const handleSaveQty = async () => {
    if (!editingItem) return;
    const newQty = parseInt(editQty);
    if (isNaN(newQty) || newQty < 1) return;
    await db.runAsync(
      "UPDATE stock_count_to_sync SET quantity = ? WHERE id = ?",
      [newQty, editingItem.id]
    );
    setEditingItem(null);
    loadData();
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch { return d; }
  };

  // ── Item card ────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ReportItem }) => (
    <View style={s.card}>
      {/* Name row */}
      <View style={s.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={s.cardName} numberOfLines={1}>
            {item.name || "Unknown Product"}
          </Text>
          <Text style={s.cardBarcode}>{item.barcode}</Text>
        </View>
        <View style={[
          s.badge,
          { backgroundColor: item.status === "synced" ? "#D1FAE5" : "#FEF3C7" }
        ]}>
          <Text style={[
            s.badgeText,
            { color: item.status === "synced" ? "#059669" : "#D97706" }
          ]}>
            {item.status === "synced" ? "Synced" : "Pending"}
          </Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* Meta row */}
      <View style={s.metaRow}>
        {/* Qty — tappable if pending */}
        <TouchableOpacity
          disabled={item.status !== "unsynced"}
          onPress={() => {
            setEditingItem({ id: item.id, qty: item.quantity });
            setEditQty(String(item.quantity));
          }}
          style={s.metaItem}
        >
          <Text style={s.metaLabel}>Qty</Text>
          <Text style={[s.metaValue, item.status === "unsynced" && s.editableVal]}>
            {item.quantity || 0}{item.status === "unsynced" ? " ✎" : ""}
          </Text>
        </TouchableOpacity>

        {item.rate != null && (
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Rate</Text>
            <Text style={s.metaValue}>₹{item.rate}</Text>
          </View>
        )}

        {item.mrp != null && (
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>MRP</Text>
            <Text style={s.metaValue}>₹{item.mrp}</Text>
          </View>
        )}
      </View>

      <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={s.emptyWrap}>
      <Ionicons
        name={filter === "synced" ? "checkmark-circle-outline" : "time-outline"}
        size={52}
        color={C.border}
      />
      <Text style={s.emptyTitle}>
        {searchQuery
          ? "No Results Found"
          : filter === "synced" ? "No Synced Records" : "No Pending Records"}
      </Text>
      <Text style={s.emptySubtitle}>
        {searchQuery
          ? "Try a different search term"
          : filter === "synced"
          ? "Upload stock counts to see them here"
          : "Scan items to add pending stock counts"}
      </Text>
    </View>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar backgroundColor="#0369A1" barStyle="light-content" />

      {/* Header — matches stock-taking / stock-upload style */}
      <LinearGradient
        colors={["#0369A1", "#0891B2", "#06B6D4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.ringOuter} />
        <View style={s.ringInner} />

         {/* Back + Icon + Title on same row */}
       <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>STOCK REPORT</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        

        <View style={s.headerWave} />
      </LinearGradient>

      {/* Search bar */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or barcode..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={C.border} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, s.tabLeft, filter === "synced" && s.tabActive]}
          onPress={() => setFilter("synced")}
        >
          <Ionicons
            name="checkmark-circle-outline" size={15}
            color={filter === "synced" ? C.white : C.textSub}
          />
          <Text style={[s.tabText, filter === "synced" && s.tabTextActive]}>
            Synced ({syncedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, filter === "unsynced" && s.tabActive]}
          onPress={() => setFilter("unsynced")}
        >
          <Ionicons
            name="time-outline" size={15}
            color={filter === "unsynced" ? C.white : C.textSub}
          />
          <Text style={[s.tabText, filter === "unsynced" && s.tabTextActive]}>
            Pending ({unsyncedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.status}-${item.id}`}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
        />
      )}

      {/* Qty Edit Overlay */}
      {editingItem && (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <Text style={s.overlayTitle}>Edit Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() =>
                  setEditQty((v) => String(Math.max(1, parseInt(v || "1") - 1)))
                }
              >
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={s.qtyInput}
                value={editQty}
                onChangeText={(v) => setEditQty(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                maxLength={5}
              />
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() =>
                  setEditQty((v) => String((parseInt(v || "0") || 0) + 1))
                }
              >
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={s.overlayActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setEditingItem(null)}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveQty}>
                <Text style={s.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Text style={s.footer}>Powered by IMC Business Solutions .V5</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F9FF" },

  // ── Header (identical pattern to stock-upload) ───────────────────────────────
  header: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 10 : 54,
    paddingBottom: 30,
    paddingHorizontal: width * 0.06,
    overflow: "hidden",
  },
  ringOuter: {
    position: "absolute", top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  ringInner: {
    position: "absolute", top: -20, right: -20,
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row", alignItems: "center",
     justifyContent: "center", flex: 1,
     gap: 10, marginBottom: 8,
  },
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: width * 0.058, fontWeight: "800",
    color: "#FFFFFF", letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: width * 0.028, color: "rgba(255,255,255,0.75)",
    fontWeight: "600", letterSpacing: 1.2, textAlign: "center",
  },
  headerWave: {
    position: "absolute", bottom: -20, left: -20, right: -20,
    height: 40, backgroundColor: "#F0F9FF", borderRadius: 40,
  },

  // ── Search ────────────────────────────────────────────────────────────────────
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    marginHorizontal: width * 0.05, marginTop: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 0 },

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: "row",
    marginHorizontal: width * 0.05, marginTop: 10, marginBottom: 6,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white, overflow: "hidden",
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: 11, gap: 6,
    backgroundColor: C.white,
  },
  tabLeft: { borderRightWidth: 1, borderRightColor: C.border },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: C.textSub },
  tabTextActive: { color: C.white },

  // ── List ──────────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: width * 0.05, paddingTop: 8, paddingBottom: 24, flexGrow: 1 },

  // ── Card ──────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardName: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 3 },
  cardBarcode: { fontSize: 12, color: C.textMuted },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 10 },
  metaRow: { flexDirection: "row", gap: 24, marginBottom: 8 },
  metaItem: {},
  metaLabel: { fontSize: 11, color: C.textMuted, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: "700", color: C.text },
  editableVal: { color: C.primary, textDecorationLine: "underline" },
  cardDate: { fontSize: 11, color: C.textMuted },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: C.textSub, marginTop: 14, marginBottom: 5 },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", paddingHorizontal: 32 },

  // ── Loading ───────────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 14, color: C.textMuted },

  // ── Qty Overlay ───────────────────────────────────────────────────────────────
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center", alignItems: "center", zIndex: 999,
  },
  overlayCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 24,
    width: 270, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  overlayTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 20 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  qtyBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primaryLt, justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: C.accent,
  },
  qtyBtnText: { fontSize: 22, fontWeight: "700", color: C.primary },
  qtyInput: {
    width: 76, textAlign: "center", fontSize: 22, fontWeight: "800",
    color: C.text, borderBottomWidth: 2, borderBottomColor: C.primary,
    paddingVertical: 4,
  },
  overlayActions: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: C.textSub },
  saveBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.primary, alignItems: "center",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: C.white },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    textAlign: "center", color: C.textMuted, fontSize: width * 0.03,
    paddingBottom: Platform.OS === "android" ? 24 : 34,
    marginTop: 8, fontWeight: "400",
  },
});