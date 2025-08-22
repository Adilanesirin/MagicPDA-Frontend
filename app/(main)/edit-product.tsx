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

  useEffect(() => {
    if (itemData) {
      const parsedItem = JSON.parse(itemData);
      setProduct(parsedItem);
      setEditedCost(parsedItem.cost?.toString() || "0");
      setEditedQuantity(parsedItem.quantity?.toString() || "1");
      setEditedSupplier(parsedItem.batchSupplier || supplier || "");
    }
  }, [itemData]);

  const handleSave = () => {
    const updatedItem = {
      ...product,
      cost: parseFloat(editedCost) || 0,
      quantity: parseInt(editedQuantity) || 1,
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
    }
  };

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
          {/* Product Info */}
          <View className="bg-white rounded-lg p-4 mb-4">
            <Text className="text-base font-semibold text-gray-800 mb-1" numberOfLines={2}>
              {product.name}
            </Text>
            <Text className="text-sm text-gray-500 mb-2">{product.barcode}</Text>
            <Text className="text-sm text-gray-600">
              MRP: <Text className="font-semibold text-green-600">₹{product.bmrp || 0}</Text>
              {" • "}Stock: <Text className="font-semibold">{product.currentStock || 0}</Text>
            </Text>
          </View>

          {/* Edit Form */}
          <View className="bg-white rounded-lg p-4 mb-4">
            {/* Quantity */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Quantity</Text>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={decrementQuantity}
                  className="bg-gray-100 w-10 h-10 rounded-lg items-center justify-center"
                >
                  <Ionicons name="remove" size={20} color="#374151" />
                </TouchableOpacity>
                <TextInput
                  value={editedQuantity}
                  onChangeText={setEditedQuantity}
                  keyboardType="numeric"
                  className="flex-1 mx-3 border border-gray-300 rounded-lg px-3 py-2 text-center font-semibold"
                />
                <TouchableOpacity
                  onPress={incrementQuantity}
                  className="bg-gray-100 w-10 h-10 rounded-lg items-center justify-center"
                >
                  <Ionicons name="add" size={20} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cost */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Cost (₹)</Text>
              <TextInput
                value={editedCost}
                onChangeText={setEditedCost}
                keyboardType="numeric"
                placeholder="0"
                className="border border-gray-300 rounded-lg px-3 py-2 font-semibold"
              />
            </View>

            {/* Supplier */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Supplier</Text>
              <TextInput
                value={editedSupplier}
                onChangeText={setEditedSupplier}
                placeholder="Supplier name"
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </View>
          </View>

          {/* Total Value */}
          <View className="bg-blue-50 rounded-lg p-4 mb-6">
            <Text className="text-center text-sm text-gray-600 mb-1">Total Value</Text>
            <Text className="text-center text-2xl font-bold text-blue-600">
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
              className="flex-1 bg-blue-500 rounded-lg py-3"
            >
              <Text className="text-white text-center font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}