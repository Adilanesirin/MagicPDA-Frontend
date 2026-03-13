import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function EditProduct() {
  const router = useRouter();
  // FIXED: Changed 'itemData' to 'item' to match barcode-entry.tsx
  const { item, itemIndex, supplier, supplier_code } = useLocalSearchParams<{
    item: string;
    itemIndex: string;
    supplier: string;
    supplier_code: string;
  }>();

  const [product, setProduct] = useState<any>({});
  const [editedCost, setEditedCost] = useState("");
  const [editedQuantity, setEditedQuantity] = useState("");
  const [editedSupplier, setEditedSupplier] = useState("");

  useEffect(() => {
    // FIXED: Changed 'itemData' to 'item'
    if (item) {
      try {
        const parsedItem = JSON.parse(item);
        console.log("📦 Parsed Product Data:", parsedItem);
        setProduct(parsedItem);
        
        // Keep cost as 0 initially
        setEditedCost("0");
        
        // Use the saved quantity value if it exists, otherwise empty string
        setEditedQuantity(parsedItem.quantity ? parsedItem.quantity.toString() : "");
        
        setEditedSupplier(parsedItem.batchSupplier || supplier || "");
      } catch (error) {
        console.error("❌ Error parsing item:", error);
      }
    }
  }, [item]);

  const handleSave = () => {
    const updatedItem = {
      ...product,
      cost: product.cost, // Keep original cost unchanged
      eCost: parseFloat(editedCost) || 0, // Save edited cost as eCost
      quantity: parseInt(editedQuantity) || 0,
      batchSupplier: editedSupplier,
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
    if (currentQty > 0) {
      setEditedQuantity((currentQty - 1).toString());
    } else {
      setEditedQuantity("0");
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
          <Text className="text-xl font-bold text-gray-800">Edit Product</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Product Info with Blue Outline - COMPLETE DETAILS */}
          <View className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-500">
            {/* Product Name */}
            <Text className="text-base font-semibold text-gray-800 mb-1" numberOfLines={2}>
              {product.name || "Product Name"}
            </Text>
            
            {/* Barcode */}
            <Text className="text-sm text-gray-500 mb-2">
              {product.barcode || "No Barcode"}
            </Text>
            
            {/* MRP and Stock */}
            <Text className="text-sm text-gray-600">
              MRP: <Text className="font-semibold text-green-600">₹{product.bmrp || 0}</Text>
              {" • "}
              Stock: <Text className="font-semibold">{product.currentStock || 0}</Text>
            </Text>
            
            {/* Original Cost and Current E.Cost */}
            <Text className="text-sm text-gray-600 mt-1">
              Original Cost: <Text className="font-semibold text-orange-600">₹{product.cost || 0}</Text>
              {" • "}
              Current E.Cost: <Text className="font-semibold text-red-600">₹{currentDisplayCost || 0}</Text>
            </Text>
          </View>

          {/* Edit Form - Compact Design */}
          <View className="bg-white rounded-lg p-4 mb-4">
            
            {/* Supplier Name */}
            <View className="mb-4">
              <Text className="text-xs text-gray-500 mb-1">Supplier</Text>
              <Text className="text-base font-semibold text-indigo-600">
                {editedSupplier || "No supplier selected"}
              </Text>
            </View>

            {/* Quantity Section */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 mb-2 font-medium">E.Qty (Editable Quantity)</Text>
              <View className="flex-row items-center justify-center">
                <TouchableOpacity
                  onPress={decrementQuantity}
                  className="bg-red-500 w-10 h-10 rounded-full items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color="#ffffff" />
                </TouchableOpacity>
                
                <TextInput
                  value={editedQuantity}
                  onChangeText={setEditedQuantity}
                  keyboardType="numeric"
                  placeholder="0"
                  className="text-center font-semibold text-gray-800 mx-4"
                  style={{ 
                    fontSize: 24,
                    minWidth: 60,
                  }}
                />
                
                <TouchableOpacity
                  onPress={incrementQuantity}
                  className="bg-blue-500 w-10 h-10 rounded-full items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* E.Cost */}
            <View>
              <Text className="text-sm text-gray-700 mb-2 font-medium">E.Cost (₹)</Text>
              <TextInput
                value={editedCost}
                onChangeText={setEditedCost}
                keyboardType="decimal-pad"
                placeholder="0.00"
                className="bg-teal-50 border border-teal-300 rounded-md px-3 py-3.5 font-semibold text-center text-teal-700"
                style={{ 
                  fontSize: 18,
                }}
              />
            </View>

          </View>

          {/* Total Value */}
          <View className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-300">
            <Text className="text-center text-sm text-gray-700 mb-1 font-medium">Total Value</Text>
            <Text className="text-center text-2xl font-bold text-blue-600">
              ₹{((parseFloat(editedCost) || 0) * (parseInt(editedQuantity) || 0)).toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={handleBack}
              className="flex-1 bg-gray-500 rounded-lg py-3"
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold text-base">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="flex-1 bg-blue-500 rounded-lg py-3"
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold text-base">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}