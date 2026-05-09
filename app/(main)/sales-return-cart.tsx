import { getDatabase } from "@/utils/database";
import { getPendingSalesReturnOrders, markSalesReturnAsSynced, saveSaleReturnToSync } from "@/utils/sync";
import { uploadPendingSalesReturnOrders } from "@/utils/upload";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

interface SalesReturnCartDrawerProps {
  visible: boolean;
  items: CartItem[];
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  /** Called when user changes qty of an item; parent should update its state */
  onUpdateQty?: (index: number, newQty: number) => void;
  /** Called after a successful upload so the parent can clear the cart / mark synced */
  onUploadSuccess?: () => void;
}

type DrawerView = "cart" | "uploading" | "success";

// ─── Qty-Edit Modal ──────────────────────────────────────────────────────────

interface QtyEditModalProps {
  visible: boolean;
  item: CartItem | null;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}

const QtyEditModal: React.FC<QtyEditModalProps> = ({
  visible,
  item,
  onConfirm,
  onCancel,
}) => {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && item) {
      setInputVal(String(item.quantity));
      // Small delay so the modal is rendered before focusing
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, item]);

  const parsed = parseInt(inputVal, 10);
  const isValid = !isNaN(parsed) && parsed > 0;

  const handleConfirm = () => {
    if (isValid) onConfirm(parsed);
  };

  const adjust = (delta: number) => {
    const next = Math.max(1, (parseInt(inputVal, 10) || 0) + delta);
    setInputVal(String(next));
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={modalStyles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={modalStyles.card}>
                {/* Header */}
                <View style={modalStyles.header}>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color="#F97316"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={modalStyles.title}>Edit Quantity</Text>
                </View>

                {/* Item name */}
                <Text style={modalStyles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={modalStyles.itemBarcode}>{item.barcode}</Text>

                {/* Stepper row */}
                <View style={modalStyles.stepperRow}>
                  <TouchableOpacity
                    style={modalStyles.stepBtn}
                    onPress={() => adjust(-1)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="remove" size={20} color="#EA580C" />
                  </TouchableOpacity>

                  <TextInput
                    ref={inputRef}
                    style={modalStyles.qtyInput}
                    value={inputVal}
                    onChangeText={(t) => setInputVal(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleConfirm}
                    selectTextOnFocus
                    maxLength={5}
                  />

                  <TouchableOpacity
                    style={modalStyles.stepBtn}
                    onPress={() => adjust(1)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="add" size={20} color="#EA580C" />
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={modalStyles.actions}>
                  <Pressable
                    onPress={onCancel}
                    style={[modalStyles.btn, modalStyles.btnCancel]}
                  >
                    <Text style={modalStyles.btnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirm}
                    style={[
                      modalStyles.btn,
                      modalStyles.btnConfirm,
                      !isValid && modalStyles.btnDisabled,
                    ]}
                    disabled={!isValid}
                  >
                    <Text style={modalStyles.btnConfirmText}>Update</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Main Drawer ─────────────────────────────────────────────────────────────

const SalesReturnCartDrawer: React.FC<SalesReturnCartDrawerProps> = ({
  visible,
  items,
  customerName,
  customerPhone,
  onClose,
  onRemoveItem,
  onUpdateQty,
  onUploadSuccess,
}) => {
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [view, setView] = useState<DrawerView>("cart");
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadedItems, setUploadedItems] = useState<CartItem[]>([]);

  // Local copy of items — qty edits update this instantly without waiting for parent
  const [localItems, setLocalItems] = useState<CartItem[]>(items);

  // Sync localItems when parent adds or removes items (but not on every render)
  useEffect(() => {
    setLocalItems([...items]);
  }, [items.length]);

  // Qty-edit modal state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  // Reset to cart view every time the drawer opens
  useEffect(() => {
    if (visible) setView("cart");
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

  const totalAmount = localItems.reduce(
    (sum, item) => sum + (item.eCost || item.cost || 0) * item.quantity,
    0
  );

  // ── Qty edit handlers ───────────────────────────────────────────────────────

  const openQtyEdit = (index: number) => {
    setEditingIndex(index);
    setEditingItem(localItems[index]);
  };

  const handleQtyConfirm = (newQty: number) => {
    if (editingIndex !== null) {
      // Update local state immediately so the UI reflects the change right away
      setLocalItems((prev) => {
        const updated = [...prev];
        updated[editingIndex] = { ...updated[editingIndex], quantity: newQty };
        return updated;
      });
      // Also notify parent if they want to persist the change
      onUpdateQty?.(editingIndex, newQty);
    }
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleQtyCancel = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  // ── Upload handler ──────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!localItems || localItems.length === 0) {
      Toast.show({ type: "info", text1: "Nothing to upload", text2: "Cart is empty." });
      return;
    }

    setUploadedItems([...localItems]);
    setView("uploading");

    try {
      const today = new Date().toISOString().split("T")[0];
      const db = getDatabase();
      await db.runAsync(`DELETE FROM sales_return_to_sync WHERE sync_status = 'pending'`);

      const clientId = (await AsyncStorage.getItem("clientId")) || "";

      for (const item of localItems) {
        await saveSaleReturnToSync({
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
          customer: customerName || "",
          enclosures: customerPhone || "",
          description: clientId,
        });
      }

      const pendingOrders = await getPendingSalesReturnOrders();
      const result = await uploadPendingSalesReturnOrders(pendingOrders);
      await markSalesReturnAsSynced();

      setUploadResult(result);
      setView("success");
      Toast.show({
        type: "success",
        text1: "✅ Upload Successful",
        text2: result.message || `Uploaded ${pendingOrders.length} return orders`,
      });
      onUploadSuccess?.();
    } catch (err: any) {
      console.error("Sales upload error:", err);
      setView("cart");
      Toast.show({
        type: "error",
        text1: "❌ Upload Failed",
        text2: err.message || "Something went wrong.",
      });
    }
  };

  const handleUploadMore = () => {
    setView("cart");
    setUploadResult(null);
    setUploadedItems([]);
  };

  if (!visible) return null;

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderCartItem = ({ item, index }: { item: CartItem; index: number }) => {
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

        {/* Right column: total + edit btn */}
        <View style={styles.itemRight}>
          <Text style={styles.itemTotal}>₹{itemTotal}</Text>
          <TouchableOpacity
            style={styles.editQtyBtn}
            onPress={() => openQtyEdit(index)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={`Edit quantity for ${item.name}`}
          >
            <Ionicons name="pencil" size={12} color="#fff" />
            <Text style={styles.editQtyText}>Edit Qty</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    // ── UPLOADING ──
    if (view === "uploading") {
      return (
        <View style={styles.centeredContent}>
          <Text style={styles.uploadingTitle}>
            Uploading Sales Return Orders...
          </Text>
          <Text style={styles.uploadingSubtitle}>Please don't close the app</Text>
          <LottieView
            source={require("@/assets/lottie/upload.json")}
            autoPlay
            loop
            style={{ width: 180, height: 180 }}
          />
          <Text style={styles.uploadingHint}>Syncing returns with server...</Text>
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
            <Ionicons name="checkmark-circle" size={48} color="#EA580C" />
          </View>
          <Text style={styles.successTitle}>Sales Return Upload Successful!</Text>
          <Text style={styles.successSubtitle}>
            {uploadResult?.message || "All return orders have been uploaded successfully."}
          </Text>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeMain}>
              Uploaded: {uploadResult?.uploaded_count || uploadedItems.length} orders
            </Text>
            <Text style={styles.successBadgeSub}>Total items: {uploadedTotal}</Text>
          </View>
          <View style={styles.successActions}>
            <Pressable
              onPress={handleUploadMore}
              style={[styles.actionBtn, styles.actionBtnPrimary]}
            >
              <Text style={styles.actionBtnTextPrimary}>Upload More Return Orders</Text>
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
        {localItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={52} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <Text style={styles.emptySubtitle}>Scan or search products to add them here</Text>
          </View>
        ) : (
          <FlatList
            data={localItems}
            keyExtractor={(item, index) => `cart-item-${item.barcode}-${index}`}
            renderItem={renderCartItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          />
        )}

        {localItems.length > 0 && (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 24 : 16) },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUpload}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload ({localItems.length})</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <>
      <View
        style={StyleSheet.absoluteFillObject}
        pointerEvents={visible ? "auto" : "none"}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        {/* Drawer Panel */}
        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          {/* Header */}
          <View
            style={[
              styles.drawerHeader,
              { paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 52 : 38) },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="arrow-forward" size={22} color="#fefeff" />
            </TouchableOpacity>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.drawerTitle}>CART</Text>
              {view === "cart" && (
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>{localItems.length}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Customer Row */}
          {view === "cart" && (customerName || customerPhone) ? (
            <View style={styles.customerRow}>
              <Ionicons name="person-circle-outline" size={18} color="#EA580C" />
              <View style={{ flex: 1 }}>
                {customerName ? (
                  <Text style={styles.customerText} numberOfLines={1}>
                    {customerName}
                  </Text>
                ) : null}
                {customerPhone ? (
                  <Text
                    style={[styles.customerText, { fontSize: 11, fontWeight: "400" }]}
                    numberOfLines={1}
                  >
                    📞 {customerPhone}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {view === "cart" && <View style={styles.divider} />}

          {renderContent()}
        </Animated.View>
      </View>

      {/* Qty Edit Modal — rendered outside the drawer so it floats above everything */}
      <QtyEditModal
        visible={editingIndex !== null}
        item={editingItem}
        onConfirm={handleQtyConfirm}
        onCancel={handleQtyCancel}
      />
    </>
  );
};

export default SalesReturnCartDrawer;

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#EA580C",
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
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
    backgroundColor: "#fffefe",
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  itemCountText: {
    color: "#ca3939",
    fontSize: 18,
    fontWeight: "700",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C2410C",
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
    alignItems: "flex-start",
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
  // Right column: total + edit button stacked
  itemRight: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 64,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EA580C",
    textAlign: "right",
  },
  editQtyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F97316",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 4,
    minWidth: 68,
  },
  editQtyText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
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
    color: "#EA580C",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F97316",
    borderRadius: 12,
    paddingVertical: 15,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  uploadingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F97316",
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
  successIconWrapper: {
    width: 80,
    height: 80,
    backgroundColor: "#FFF7ED",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#C2410C",
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  successBadge: {
    backgroundColor: "#FFF7ED",
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
    color: "#9A3412",
  },
  successBadgeSub: {
    fontSize: 12,
    color: "#C2410C",
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
  actionBtnPrimary: { backgroundColor: "#F97316" },
  actionBtnSecondary: { backgroundColor: "#E2E8F0" },
  actionBtnTextPrimary: { color: "#fff", fontSize: 15, fontWeight: "700" },
  actionBtnTextSecondary: { color: "#475569", fontSize: 15, fontWeight: "600" },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#EA580C",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
    lineHeight: 20,
  },
  itemBarcode: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 20,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    width: 80,
    height: 52,
    borderWidth: 2,
    borderColor: "#F97316",
    borderRadius: 12,
    fontSize: 22,
    fontWeight: "700",
    color: "#EA580C",
    textAlign: "center",
    backgroundColor: "#F8FAFC",
    // Android needs explicit padding reset for centered text
    paddingVertical: Platform.OS === "android" ? 0 : 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "#F1F5F9",
  },
  btnConfirm: {
    backgroundColor: "#F97316",
  },
  btnDisabled: {
    backgroundColor: "#BAE6FD",
  },
  btnCancelText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 15,
  },
  btnConfirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});