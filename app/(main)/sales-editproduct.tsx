import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function EditSalesProduct() {
  const router = useRouter();
  const { itemData, itemIndex } = useLocalSearchParams<{
    itemData: string;
    itemIndex: string;
  }>();

  const [product, setProduct] = useState<any>({});
  const [editedCost, setEditedCost] = useState("");
  const [editedQuantity, setEditedQuantity] = useState("");
  const [editedMrp, setEditedMrp] = useState("");
  const [mrpEditable, setMrpEditable] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const mrpSetting = await SecureStore.getItemAsync("mrpEditable");
      setMrpEditable(mrpSetting === "true");
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (itemData) {
      const parsedItem = JSON.parse(itemData);
      setProduct(parsedItem);
      const currentECost = parsedItem.eCost || parsedItem.cost || 0;
      setEditedCost(currentECost.toString());
      setEditedQuantity(parsedItem.quantity ? parsedItem.quantity.toString() : "");
      setEditedMrp(parsedItem.bmrp ? parsedItem.bmrp.toString() : "0");
    }
  }, [itemData]);

  const handleSave = () => {
    const updatedItem = {
      ...product,
      cost: parseFloat(editedCost) || product.cost || 0,
      eCost: parseFloat(editedCost) || 0,
      quantity: parseInt(editedQuantity) || 0,
      bmrp: parseFloat(editedMrp) || product.bmrp || 0,
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

  const incrementQuantity = () => {
    const currentQty = parseInt(editedQuantity) || 0;
    setEditedQuantity((currentQty + 1).toString());
  };

  const decrementQuantity = () => {
    const currentQty = parseInt(editedQuantity) || 0;
    if (currentQty > 0) {
      setEditedQuantity((currentQty - 1).toString());
    } else {
      setEditedQuantity("0");
    }
  };

  const currentDisplayCost = (product.eCost !== undefined && product.eCost !== 0)
    ? product.eCost
    : (product.cost || 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#f5f7f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Sales Product</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* Product Info Card */}
          <View style={styles.productInfoCard}>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productBarcode}>{product.barcode}</Text>
            <View style={styles.productMetaRow}>
              <Text style={styles.metaText}>
                MRP: <Text style={styles.mrpValue}>₹{product.bmrp || 0}</Text>
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                Stock: <Text style={styles.stockValue}>{product.currentStock || 0}</Text>
              </Text>
            </View>
            
          </View>

          {/* Edit Form Card */}
          <View style={styles.formCard}>

            {/* Quantity Section */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>E.Qty (Sales Quantity)</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity onPress={decrementQuantity} style={styles.qtyDecrBtn} activeOpacity={0.7}>
                  <Ionicons name="remove" size={20} color="#ffffff" />
                </TouchableOpacity>
                <TextInput
                  value={editedQuantity}
                  onChangeText={setEditedQuantity}
                  keyboardType="numeric"
                  placeholder="0"
                  style={styles.quantityInput}
                />
                <TouchableOpacity onPress={incrementQuantity} style={styles.qtyIncrBtn} activeOpacity={0.7}>
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* MRP and E.Cost Row */}
            <View style={styles.twoColRow}>

             {/* MRP */}
                <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>MRP (₹)</Text>
                    {!mrpEditable && <Text style={styles.lockedLabel}>Locked</Text>}
                </View>
                <TextInput
                    value={editedMrp}
                    onChangeText={mrpEditable ? setEditedMrp : undefined}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    editable={mrpEditable}
                    style={[styles.priceInput, mrpEditable ? styles.priceInputEditable : styles.priceInputLocked]}
                />
                {!mrpEditable && <Text style={styles.lockedHint}>Enable in Settings</Text>}
                </View>

               
            </View>
          </View>

          {/* Total Value */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Sales Total Value</Text>
            <Text style={styles.totalValue}>
              ₹{((parseFloat(editedCost) || 0) * (parseInt(editedQuantity) || 0)).toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleBack} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Save</Text>
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
    backgroundColor: '#F1F5F9',
  },

  header: {
    backgroundColor: '#131f3d',
    paddingTop: Platform.OS === 'android' ? 55 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },

  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Product Info Card
  productInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#dfe4f1',
    shadowColor: '#08084b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  metaDot: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  mrpValue: {
    fontWeight: '700',
    color: '#059669',
  },
  stockValue: {
    fontWeight: '700',
    color: '#2563EB',
  },
  originalCostValue: {
    fontWeight: '700',
    color: '#EA580C',
  },
  eCostValue: {
    fontWeight: '700',
    color: '#DC2626',
  },

  // Form Card
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },

  // Quantity controls
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  qtyDecrBtn: {
    backgroundColor: '#EF4444',
    width: 35,
    height: 35,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyIncrBtn: {
    backgroundColor: '#3B82F6',
    width: 35,
    height: 35,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    minWidth: 70,
    borderBottomWidth: 2,
    borderBottomColor: '#131f3d',
    paddingVertical: 4,
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockedLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  lockedHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Price inputs
  priceInput: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    width: '100%',          
  },
  priceInputEditable: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
    color: '#7C3AED',
  },
  priceInputLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    color: '#94A3B8',
  },
  priceInputCost: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    color: '#059669',
  },

  // Total Card
  totalCard: {
    backgroundColor: '#dadfed',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#274f87',
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#151c5e',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#7e90ab',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#131f3d',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});