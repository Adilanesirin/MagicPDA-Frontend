// app/upload.tsx
import {
  getLocalDataStats,
  getPendingOrders,
  markOrdersAsSynced,
} from "@/utils/sync";
import { uploadPendingOrders } from "@/utils/upload";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

export default function Upload() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const loadData = async () => {
    const data = await getPendingOrders();
    const s = await getLocalDataStats();
    
    // FIX: Ensure orders is always an array, never undefined
    setOrders(Array.isArray(data) ? data : []);
    setStats(s || {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async () => {
    // FIX: Added proper array check
    if (!orders || orders.length === 0) {
      Toast.show({
        type: "info",
        text1: "Nothing to upload",
        text2: "All entries are already synced.",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await uploadPendingOrders(orders);

      await markOrdersAsSynced();
      await loadData();

      await new Promise((resolve) => setTimeout(resolve, 3000));

      setUploadSuccess(true);
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: "❌ Upload Failed",
        text2: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToUploadView = () => {
    setUploadSuccess(false);
    loadData(); // Refresh data
  };

  // FIX: Added safe calculation for total items
  const totalItems = Array.isArray(orders) 
    ? orders.reduce((acc, cur) => acc + (cur.products?.length || 0), 0)
    : 0;

  return (
    <View className="flex-1 justify-center items-center px-4">
      {/* Back Button */}
      <TouchableOpacity 
        className="absolute top-12 left-4 bg-white p-2 rounded-full shadow-md z-10"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#3B82F6" />
      </TouchableOpacity>

      <View className="w-full max-w-[360px] bg-white rounded-2xl shadow-lg p-6">
        {uploadSuccess ? (
          // Success Card
          <View className="items-center">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            </View>
            
            <Text className="text-2xl font-bold text-green-600 text-center mb-2">
              Upload Successful!
            </Text>
            
            <Text className="text-base text-gray-600 text-center mb-6">
              All orders have been uploaded and synced successfully.
            </Text>

            <View className="w-full gap-y-3">
              <Pressable
                onPress={resetToUploadView}
                className="p-4 rounded-xl bg-blue-500"
              >
                <Text className="text-white text-center font-semibold">
                  Upload More Orders
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                className="p-4 rounded-xl bg-gray-200"
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Go Back
                </Text>
              </Pressable>
            </View>
          </View>
        ) : loading ? (
          // Loading State
          <View className="items-center">
            <Text className="text-2xl font-semibold text-blue-400 mb-2">
              Uploading...
            </Text>
            <LottieView
              source={require("@/assets/lottie/upload.json")}
              autoPlay
              loop
              style={{ width: 180, height: 180 }}
            />
          </View>
        ) : (
          // Upload Form
          <>
            <View className="flex-row justify-center items-center gap-2 mb-6">
              <Ionicons name="cloud-upload-outline" size={28} color="#60A5FA" />
              <Text className="text-2xl font-bold text-blue-400 text-center">
                Upload Pending Orders
              </Text>
            </View>
            <View className="gap-y-4 mb-8">
              <View className="flex flex-row gap-1">
                <Text>📦</Text>
                <Text className="text-base text-gray-700">
                  Pending Orders: {orders.length}
                </Text>
              </View>
              <View className="flex flex-row gap-1">
                <Text>🎰</Text>
                <Text className="text-base text-gray-700">
                  Total Items: {totalItems}
                </Text>
              </View>
              <View className="flex flex-row gap-1">
                <Text>⏱️</Text>
                <Text className="text-sm text-gray-500">
                  Last Synced: {stats.lastSynced || "Never"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleUpload}
              disabled={loading || orders.length === 0}
              className={`p-4 rounded-xl ${
                orders.length === 0 ? "bg-gray-400" : "bg-orange-400"
              }`}
            >
              <Text className="text-white text-center font-semibold">
                Upload
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}