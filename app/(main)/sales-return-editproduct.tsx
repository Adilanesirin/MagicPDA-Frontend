import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function EditSalesReturnProduct() {
  const router = useRouter();
  const { itemData, itemIndex } = useLocalSearchParams<{
    itemData: string;
    itemIndex: string;
  }>();

  const [product, setProduct] = useState<any>({});
  const [editedQuantity, setEditedQuantity] = useState(0);

  useEffect(() => {
    if (itemData) {
      const parsedItem = JSON.parse(itemData);
      setProduct(parsedItem);
      setEditedQuantity(parsedItem.quantity ? parseInt(parsedItem.quantity) : 0);
    }
  }, [itemData]);

  const handleSave = () => {
    const updatedItem = {
      ...product,
      quantity: editedQuantity,
    };
    router.back();
    setTimeout(() => {
      router.setParams({
        updatedItem: JSON.stringify(updatedItem),
        itemIndex,
      });
    }, 100);
  };

  const handleBack = () => router.back();

  const incrementQuantity = () => setEditedQuantity((q) => q + 1);
  const decrementQuantity = () => setEditedQuantity((q) => Math.max(0, q - 1));

  const mrp = product.bmrp || 0;
  const total = (mrp * editedQuantity).toFixed(2);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Edit Sales Return</Text>
          <Text style={styles.headerSub}>Update product details</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* Product Info Card */}
          <View style={styles.productCard}>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productBarcode}>{product.barcode}</Text>
            <View style={styles.pillsRow}>
              <View style={[styles.pill, styles.pillMrp]}>
                <Text style={styles.pillMrpText}>MRP ₹{mrp.toFixed(2)}</Text>
              </View>
              <View style={[styles.pill, styles.pillStock]}>
                <Text style={styles.pillStockText}>Stock: {product.currentStock || 0}</Text>
              </View>
            </View>
          </View>

          {/* Quantity Card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Return Quantity</Text>
            <Text style={styles.qtyLabel}>E.Qty (Sales Quantity)</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity onPress={decrementQuantity} style={styles.qtyDecrBtn} activeOpacity={0.7}>
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{editedQuantity}</Text>
              <TouchableOpacity onPress={incrementQuantity} style={styles.qtyIncrBtn} activeOpacity={0.7}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.qtyUnit}>units to return</Text>
          </View>

          {/* Total Card */}
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Sales Return Total</Text>
              <Text style={styles.totalCalc}>MRP ₹{mrp.toFixed(2)} × {editedQuantity} units</Text>
            </View>
            <Text style={styles.totalAmount}>₹{total}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleBack} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  // Header
  header: {
    backgroundColor: "#EA580C",
    paddingTop: Platform.OS === "android" ? 55 : 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 1,
  },

  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  // Product Card
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#EA580C",
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 12,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillMrp: { backgroundColor: "#DCFCE7" },
  pillMrpText: { fontSize: 11, fontWeight: "600", color: "#166534" },
  pillStock: { backgroundColor: "#DBEAFE" },
  pillStockText: { fontSize: 11, fontWeight: "600", color: "#1E40AF" },

  // Quantity Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#94A3B8",
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  qtyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  qtyDecrBtn: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyIncrBtn: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 60,
    textAlign: "center",
    borderBottomWidth: 2.5,
    borderBottomColor: "#EA580C",
    paddingBottom: 2,
  },
  qtyUnit: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 8,
  },

  // Total Card
  totalCard: {
    backgroundColor: "#FFEDD5",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
    marginBottom: 3,
  },
  totalCalc: {
    fontSize: 11,
    color: "#C2410C",
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#7C2D12",
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#FED7AA",
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#9A3412",
    fontWeight: "700",
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: "#EA580C",
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});