import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function EditGRNProduct() {
  const router = useRouter();
  const { itemData, itemIndex, supplier, supplier_code } = useLocalSearchParams<{
    itemData: string;
    itemIndex: string;
    supplier: string;
    supplier_code: string;
  }>();

  const [product, setProduct] = useState<any>({});
  const [editedCost, setEditedCost] = useState("");
  const [editedQuantity, setEditedQuantity] = useState("");
  const [editedSupplier, setEditedSupplier] = useState("");
  const [editedMrp, setEditedMrp] = useState("");
  const [mrpEditable, setMrpEditable] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      // Load MRP editable setting
      const mrpSetting = await SecureStore.getItemAsync("mrpEditable");
      setMrpEditable(mrpSetting === "true");
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (itemData) {
      const parsedItem = JSON.parse(itemData);
      setProduct(parsedItem);
      
      // UPDATED LOGIC: If eCost is 0 or not set, use cost value
      const initialECost = (parsedItem.eCost && parsedItem.eCost !== 0) 
        ? parsedItem.eCost 
        : (parsedItem.cost || 0);
      
      setEditedCost(initialECost.toString());
      
      // FIX: Use the saved quantity value if it exists, otherwise empty string
      setEditedQuantity(parsedItem.quantity ? parsedItem.quantity.toString() : "");
      
      setEditedSupplier(parsedItem.batchSupplier || supplier || "");
      
      // Set MRP value
      setEditedMrp(parsedItem.bmrp ? parsedItem.bmrp.toString() : "0");
    }
  }, [itemData]);

  const handleSave = () => {
    const updatedItem = {
      ...product,
      cost: product.cost, // Keep original cost unchanged
      eCost: parseFloat(editedCost) || 0, // Save edited cost as eCost
      quantity: parseInt(editedQuantity) || 0, // Changed from 1 to 0 to allow 0 quantity
      batchSupplier: editedSupplier,
      bmrp: parseFloat(editedMrp) || product.bmrp || 0, // Update MRP if editable
    };

    // Navigate back with updated data using router.back() and passing params
    router.back();
    // Use setTimeout to ensure navigation completes before setting params
    setTimeout(() => {
      router.setParams({
        updatedItem: JSON.stringify(updatedItem),
        itemIndex,
      });
    }, 100);
  };

  const handleBack = () => {
    router.back();
  };

  const incrementQuantity = () => {
    const currentQty = parseInt(editedQuantity) || 0;
    setEditedQuantity((currentQty + 1).toString());
  };

  const decrementQuantity = () => {
    const currentQty = parseInt(editedQuantity) || 0;
    if (currentQty > 0) { // Changed from > 1 to > 0
      setEditedQuantity((currentQty - 1).toString());
    } else {
      setEditedQuantity("0"); // Changed from "" to "0"
    }
  };

  // Display the current effective cost (eCost if set, otherwise cost)
  const currentDisplayCost = (product.eCost && product.eCost !== 0) ? product.eCost : product.cost;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      className="bg-gray-50"
    >
      {/* Simple Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Edit GRN Product</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Product Info with Pink Outline */}
          <View className="bg-white rounded-lg p-4 mb-4 border-2 border-pink-500">
            <Text className="text-base font-semibold text-gray-800 mb-1" numberOfLines={2}>
              {product.name}
            </Text>
            <Text className="text-sm text-gray-500 mb-2">{product.barcode}</Text>
            <Text className="text-sm text-gray-600">
              MRP: <Text className="font-semibold text-green-600">₹{product.bmrp || 0}</Text>
              {" • "}Stock: <Text className="font-semibold">{product.currentStock || 0}</Text>
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Original Cost: <Text className="font-semibold text-orange-600">₹{product.cost || 0}</Text>
              {" • "}Current E.Cost: <Text className="font-semibold text-red-600">₹{currentDisplayCost || 0}</Text>
            </Text>
          </View>

          {/* Edit Form - Reordered: Supplier, E.Qty, MRP (conditional), E.Cost */}
          <View className="bg-white rounded-lg p-4 mb-4">
            {/* Supplier (Non-editable) */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Supplier</Text>
              <View className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-100">
                <Text className="text-gray-600">{editedSupplier || "No supplier selected"}</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                Supplier information is read-only
              </Text>
            </View>

            {/* Quantity - Enhanced with Blue Outline */}
            <View className="mb-6">
              <Text className="text-gray-700 font-bold mb-3 text-base">E.Qty (GRN Quantity)</Text>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={decrementQuantity}
                  className="bg-blue-100 w-12 h-14 rounded-lg items-center justify-center border-2 border-blue-400"
                >
                  <Ionicons name="remove" size={24} color="#2563eb" />
                </TouchableOpacity>
                <TextInput
                  value={editedQuantity}
                  onChangeText={setEditedQuantity}
                  keyboardType="numeric"
                  placeholder="0"
                  className="flex-1 mx-3 border-3 border-blue-500 rounded-lg px-4 py-4 text-center font-bold text-xl bg-blue-50"
                  style={{ 
                    fontSize: 20,
                    minHeight: 56,
                  }}
                />
                <TouchableOpacity
                  onPress={incrementQuantity}
                  className="bg-blue-100 w-12 h-14 rounded-lg items-center justify-center border-2 border-blue-400"
                >
                  <Ionicons name="add" size={24} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>

            {/* MRP - Conditional Editable with Purple Outline */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-700 font-bold text-base">
                  MRP (₹)
                </Text>
                {!mrpEditable && (
                  <View className="bg-gray-200 px-2 py-1 rounded">
                    <Text className="text-xs text-gray-600">Read Only</Text>
                  </View>
                )}
              </View>
              <TextInput
                value={editedMrp}
                onChangeText={mrpEditable ? setEditedMrp : undefined}
                keyboardType="decimal-pad"
                placeholder="0.00"
                editable={mrpEditable}
                className={`rounded-lg px-4 py-4 font-bold text-xl ${
                  mrpEditable 
                    ? 'border-3 border-purple-500 bg-purple-50' 
                    : 'border border-gray-300 bg-gray-100'
                }`}
                style={{ 
                  fontSize: 20,
                  minHeight: 56,
                  color: mrpEditable ? '#000' : '#6B7280',
                }}
              />
              <Text className="text-xs text-gray-500 mt-2">
                {mrpEditable 
                  ? `You can modify MRP by enabling it in Settings. Original: ₹${product.bmrp || 0}`
                  : 'MRP editing is disabled. Enable in Settings to edit.'}
              </Text>
            </View>

            {/* Cost - Enhanced with Green Outline */}
            <View>
              <Text className="text-gray-700 font-bold mb-3 text-base">
                E.Cost (₹) - GRN Rate
              </Text>
              <TextInput
                value={editedCost}
                onChangeText={setEditedCost}
                keyboardType="decimal-pad"
                placeholder="0.00"
                className="border-3 border-green-500 rounded-lg px-4 py-4 font-bold text-xl bg-green-50"
                style={{ 
                  fontSize: 20,
                  minHeight: 56,
                }}
              />
              <Text className="text-xs text-gray-500 mt-2">
                Modify this cost if needed. Original cost: ₹{product.cost || 0}
              </Text>
            </View>
          </View>

          {/* Total Value */}
          <View className="bg-pink-50 rounded-lg p-4 mb-6 border-2 border-pink-300">
            <Text className="text-center text-sm text-gray-600 mb-1">GRN Total Value</Text>
            <Text className="text-center text-2xl font-bold text-pink-600">
              ₹{((parseFloat(editedCost) || 0) * (parseInt(editedQuantity) || 0)).toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-8">
            <TouchableOpacity
              onPress={handleBack}
              className="flex-1 bg-gray-400 rounded-lg py-3"
            >
              <Text className="text-white text-center font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="flex-1 bg-pink-500 rounded-lg py-3"
            >
              <Text className="text-white text-center font-semibold">Save GRN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}