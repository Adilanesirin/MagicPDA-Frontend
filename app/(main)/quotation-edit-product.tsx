import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
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
      try {
        const parsedItem = JSON.parse(itemData);
        console.log("📦 Parsed Product Data:", parsedItem);
        setProduct(parsedItem);
        
        // Keep cost as 0 initially
                // Start with the current E.Rate
        setEditedCost(parsedItem.eCost ? parsedItem.eCost.toString() : "0");
        
        // Use the saved quantity value if it exists, otherwise empty string
        setEditedQuantity(parsedItem.quantity ? parsedItem.quantity.toString() : "");
        
        setEditedSupplier(parsedItem.batchSupplier || supplier || "");
      } catch (error) {
        console.error("❌ Error parsing item:", error);
      }
    }
  }, [itemData]);

  const handleSave = () => {
    const updatedItem = {
      ...product,
      cost: product.cost, // Keep original cost unchanged
      eCost: parseFloat(editedCost) || 0, // Save edited cost as eCost
      quantity: parseInt(editedQuantity) || 0,
      batchSupplier: editedSupplier,
    };

    router.replace({
      pathname: "/quotation-barcode-entry",
      params: {
        supplier: supplier || "",
        supplier_code: supplier_code || "",
        updatedItem: JSON.stringify(updatedItem),
        itemIndex,
      },
    } as any);
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
      className="bg-slate-100"
    >
      <StatusBar backgroundColor="#0F766E" barStyle="light-content" />
      <LinearGradient
        colors={["#0F766E", "#14B8A6", "#2DD4BF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-b-[28px] px-5 pb-5"
        style={{ paddingTop: Platform.OS === "android" ? 50 : 60 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/20"
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
              Edit Quotation Product
            </Text>
            <Text className="mt-1 text-xs text-white/80" numberOfLines={1}>
                Update quantity and rate
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Product Info with Blue Outline - COMPLETE DETAILS */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-teal-200 shadow-sm">
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
                            Current E.Rate: <Text className="font-semibold text-red-600">₹{currentDisplayCost || 0}</Text>
            </Text>
          </View>

          {/* Edit Form - Compact Design */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-200 shadow-sm">
            
            {/* Supplier Name */}
            <View className="mb-4">
              <Text className="text-xs text-gray-500 mb-1">Customer</Text>
              <Text className="text-base font-semibold text-teal-700">
                {editedSupplier || "No customer selected"}
              </Text>
            </View>

            {/* Quantity Section */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 mb-2 font-medium">E.Qty (Editable Quantity)</Text>
              <View className="flex-row items-center justify-center">
                <TouchableOpacity
                  onPress={decrementQuantity}
                  className="bg-teal-100 w-10 h-10 rounded-full items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color="#0F766E" />
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
                  className="bg-teal-700 w-10 h-10 rounded-full items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* E.Cost */}
            <View>
                            <Text className="text-sm text-gray-700 mb-2 font-medium">E.Rate (₹)</Text>
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
          <View className="bg-teal-50 rounded-2xl p-4 mb-4 border border-teal-200">
              <Text className="text-center text-sm text-gray-700 mb-1 font-medium">Quotation Total Value</Text>
            <Text className="text-center text-2xl font-bold text-teal-700">
              ₹{((parseFloat(editedCost) || 0) * (parseInt(editedQuantity) || 0)).toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={handleBack}
              className="flex-1 bg-slate-500 rounded-xl py-3"
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold text-base">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="flex-1 bg-teal-700 rounded-xl py-3"
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold text-base">Save Quotation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
