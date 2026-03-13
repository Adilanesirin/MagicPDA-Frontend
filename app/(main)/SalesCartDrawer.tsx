import { getDatabase } from "@/utils/database";
import { getPendingSalesOrders, markSalesAsSynced, saveSaleToSync } from "@/utils/sync";
import { uploadPendingSalesOrders } from "@/utils/upload";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface CartItem {
  id?: number;
  barcode: string;
  name: string;
  quantity: number;
  cost?: number;
  eCost?: number;
  bmrp?: number;
  // Fields forwarded to uploadPendingSalesOrders
  supplier_code?: string;
  userid?: string;
  itemcode?: string;
  rate?: number;
  mrp?: number;
  sale_date?: string;
  order_date?: string;
  created_at?: string;
  is_manual_entry?: number | string | boolean;
  product_name?: string;
}

interface SalesCartDrawerProps {
  visible: boolean;
  items: CartItem[];
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  /** Called after a successful upload so the parent can clear the cart / mark synced */
  onUploadSuccess?: () => void;
}

type DrawerView = "cart" | "uploading" | "success";

const SalesCartDrawer: React.FC<SalesCartDrawerProps> = ({
  visible,
  items,
  customerName,
  customerPhone,
  onClose,
  onRemoveItem,
  onUploadSuccess,
}) => {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [view, setView] = useState<DrawerView>("cart");
  const [uploadResult, setUploadResult] = useState<any>(null);
  // Snapshot the items when upload starts so the success screen keeps the
  // correct count even after the parent clears the cart.
  const [uploadedItems, setUploadedItems] = useState<CartItem[]>([]);

  // Reset to cart view every time the drawer opens
  useEffect(() => {
    if (visible) {
      setView("cart");
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.eCost || item.cost || 0) * item.quantity,
    0
  );

  // ── Upload handler ──────────────────────────────────────────────────────────

const handleUpload = async () => {
  if (!items || items.length === 0) {
    Toast.show({ type: "info", text1: "Nothing to upload", text2: "Cart is empty." });
    return;
  }

  setUploadedItems([...items]);
  setView("uploading");

  try {
    // Step 1: Save cart items to sales_to_sync DB table
    const today = new Date().toISOString().split("T")[0];
    const db = getDatabase(); 
    await db.runAsync(`DELETE FROM sales_to_sync WHERE sync_status = 'pending'`);


    const clientId = await AsyncStorage.getItem('clientId') || '';  // ← MOVE HERE

    for (const item of items) {
      await saveSaleToSync({
        supplier_code: item.supplier_code || "",
        userid: item.userid || "",
        itemcode: item.itemcode || item.barcode,
        barcode: item.barcode,
        quantity: item.quantity,
        rate: item.eCost || item.cost || item.rate || 0,
        mrp: item.bmrp || item.mrp || 0,
        sale_date: item.sale_date || item.order_date || today,
        product_name: item.name || item.product_name || "",
        is_manual_entry: item.is_manual_entry ? 1 : 0,
        customer: customerName || '',        
        enclosures: customerPhone || '',    
        description: clientId,
      });
    }
    // Step 2: Fetch properly-formed records from DB
    const pendingOrders = await getPendingSalesOrders();

    // Step 3: Upload then mark synced
    const result = await uploadPendingSalesOrders(pendingOrders);
    await markSalesAsSynced();

    setUploadResult(result);
    setView("success");
    Toast.show({
      type: "success",
      text1: "✅ Upload Successful",
      text2: result.message || `Uploaded ${pendingOrders.length} sales orders`,
    });
    onUploadSuccess?.();
  } catch (err: any) {
    console.error("Sales upload error:", err);
    setView("cart");
    Toast.show({ type: "error", text1: "❌ Upload Failed", text2: err.message || "Something went wrong." });
  }
};

  const handleUploadMore = () => {
    setView("cart");
    setUploadResult(null);
    setUploadedItems([]);
  };

  if (!visible) return null;

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderCartItem = ({
    item,
    index,
  }: {
    item: CartItem;
    index: number;
  }) => {
    const itemTotal = ((item.eCost || item.cost || 0) * item.quantity).toFixed(2);
    const unitPrice = (item.eCost || item.cost || 0).toFixed(2);

    return (
      <View style={styles.cartItem}>
        {/* Remove button */}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onRemoveItem(index)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>

        {/* Item info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.itemBarcode} numberOfLines={1}>
            {item.barcode}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
            <Text style={styles.itemDot}>•</Text>
            <Text style={styles.itemPrice}>₹{unitPrice}/unit</Text>
          </View>
        </View>

        {/* Item total */}
        <Text style={styles.itemTotal}>₹{itemTotal}</Text>
      </View>
    );
  };

  const renderContent = () => {
    // ── UPLOADING ──
    if (view === "uploading") {
      return (
        <View style={styles.centeredContent}>
          <Text style={styles.uploadingTitle}>
            Uploading {uploadedItems.length} Sales Orders...
          </Text>
          <Text style={styles.uploadingSubtitle}>
            Please don't close the app
          </Text>
          <LottieView
            source={require("@/assets/lottie/upload.json")}
            autoPlay
            loop
            style={{ width: 180, height: 180 }}
          />
          <Text style={styles.uploadingHint}>
            Syncing sales with server...
          </Text>
        </View>
      );
    }

    // ── SUCCESS ──
    if (view === "success") {
      const uploadedTotal = uploadedItems.reduce(
        (acc, item) => acc + (parseInt(String(item.quantity)) || 0),
        0
      );
      return (
        <View style={styles.centeredContent}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          </View>

          <Text style={styles.successTitle}>Sales Upload Successful!</Text>

          <Text style={styles.successSubtitle}>
            {uploadResult?.message ||
              "All sales orders have been uploaded successfully."}
          </Text>

          <View style={styles.successBadge}>
            <Text style={styles.successBadgeMain}>
              Uploaded:{" "}
              {uploadResult?.uploaded_count || uploadedItems.length} orders
            </Text>
            <Text style={styles.successBadgeSub}>
              Total items: {uploadedTotal}
            </Text>
          </View>

          <View style={styles.successActions}>
            <Pressable
              onPress={handleUploadMore}
              style={[styles.actionBtn, styles.actionBtnPrimary]}
            >
              <Text style={styles.actionBtnTextPrimary}>
                Upload More Sales Orders
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[styles.actionBtn, styles.actionBtnSecondary]}
            >
              <Text style={styles.actionBtnTextSecondary}>Close</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // ── CART (default) ──
    return (
      <>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={52} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Scan or search products to add them here
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, index) =>
              `cart-item-${item.barcode}-${index}`
            }
            renderItem={renderCartItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View style={styles.itemSeparator} />
            )}
          />
        )}

        {items.length > 0 && (
          <View style={styles.footer}>
            {/* Total Row */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>
                ₹{totalAmount.toFixed(2)}
              </Text>
            </View>

            {/* Upload Button */}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUpload}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>
                Upload ({items.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer Panel */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* -- Drawer Header -- */}
        <View style={styles.drawerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-forward" size={22} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.drawerTitle}>Cart</Text>
            {view === "cart" && (
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{items.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* -- Customer Row (cart view only) -- */}
        {view === "cart" && (customerName || customerPhone) ? (
        <View style={styles.customerRow}>
          <Ionicons name="person-circle-outline" size={18} color="#10B981" />
          <View style={{ flex: 1 }}>
            {customerName ? (
              <Text style={styles.customerText} numberOfLines={1}>
                {customerName}
              </Text>
            ) : null}
            {customerPhone ? (
              <Text style={[styles.customerText, { fontSize: 11, fontWeight: '400' }]} numberOfLines={1}>
                📞 {customerPhone}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
        {/* -- Divider (cart view only) -- */}
        {view === "cart" && <View style={styles.divider} />}

        {/* -- Dynamic content -- */}
        {renderContent()}
      </Animated.View>
    </View>
  );
};

export default SalesCartDrawer;

// --- Styles ------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
    flexDirection: "column",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 58 : 42,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#131f3d",
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: 0.3,
  },
  itemCountBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  itemCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    marginTop: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 18,
    marginBottom: 2,
  },
  itemBarcode: {
    fontSize: 10,
    color: "#94A3B8",
    marginBottom: 3,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemQty: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  itemDot: {
    fontSize: 10,
    color: "#CBD5E1",
  },
  itemPrice: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#131f3d",
    minWidth: 64,
    textAlign: "right",
  },
  itemSeparator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 42,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    backgroundColor: "#FAFAFA",
    gap: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#131f3d",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#43b1d6",
    borderRadius: 12,
    paddingVertical: 15,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Uploading / Success shared ─────────────────────────────────────────────
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    gap: 12,
  },
  uploadingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#43b1d6",
    textAlign: "center",
  },
  uploadingSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
  uploadingHint: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 8,
  },

  // ── Success ────────────────────────────────────────────────────────────────
  successIconWrapper: {
    width: 80,
    height: 80,
    backgroundColor: "#D1FAE5",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#059669",
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  successBadge: {
    backgroundColor: "#ECFDF5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    gap: 4,
  },
  successBadgeMain: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  successBadgeSub: {
    fontSize: 12,
    color: "#059669",
  },
  successActions: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    backgroundColor: "#43b1d6",
  },
  actionBtnSecondary: {
    backgroundColor: "#E2E8F0",
  },
  actionBtnTextPrimary: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  actionBtnTextSecondary: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
  },
});
