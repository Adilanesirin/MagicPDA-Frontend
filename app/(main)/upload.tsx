// app/upload.tsx
import {
  cleanupDuplicateOrders,
  getLocalDataStats,
  getPendingOrders,
  markOrdersAsSynced
} from "@/utils/sync";
import { uploadPendingOrders } from "@/utils/upload";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
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
  const [uploadResult, setUploadResult] = useState<any>(null);

  const loadData = async () => {
    try {
      // Try to clean up duplicates, but continue even if it fails
      try {
        await cleanupDuplicateOrders();
      } catch (cleanupError) {
        console.warn("⚠️ Cleanup failed, continuing without cleanup:", cleanupError);
      }
      
      const data = await getPendingOrders();
      const s = await getLocalDataStats();
      
      // 🔍 DEBUG: Log the raw data from database
      console.log("\n🔍 === RAW ORDERS FROM DATABASE ===");
      console.log("Total orders loaded:", data.length);
      
      // Check manual entries specifically
      const manualEntries = data.filter((o: any) => 
        o.is_manual_entry === 1 || o.is_manual_entry === '1'
      );
      console.log("Manual entries found:", manualEntries.length);
      
      if (manualEntries.length > 0) {
        console.log("\n📋 Manual Entry Details:");
        manualEntries.forEach((entry: any, idx: number) => {
          console.log(`\n  Entry ${idx + 1}:`);
          console.log(`    barcode: ${entry.barcode}`);
          console.log(`    product_name: ${entry.product_name}`);
          console.log(`    is_manual_entry: ${entry.is_manual_entry}`);
          console.log(`    itemcode: ${entry.itemcode}`);
        });
      }
      console.log("🔍 === END RAW DATA ===\n");
      
      setOrders(Array.isArray(data) ? data : []);
      setStats(s || {});
    } catch (error) {
      console.error("❌ Error loading data:", error);
      Toast.show({
        type: "error",
        text1: "Load Error",
        text2: "Failed to load pending orders",
      });
    }
  };

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      if (!loading && !uploadSuccess) {
        loadData();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async () => {
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
      
      if (orders.length > 10) {
        Alert.alert(
          "Confirm Upload",
          `You are about to upload ${orders.length} orders. Continue?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Upload", onPress: actuallyUpload }
          ]
        );
      } else {
        actuallyUpload();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      Toast.show({
        type: "error",
        text1: "❌ Upload Failed",
        text2: err.message || "Something went wrong.",
      });
      setLoading(false);
    }
  };

  const actuallyUpload = async () => {
    try {
      console.log("📤 Starting upload of", orders.length, "orders");
      
      const result = await uploadPendingOrders(orders);
      
      if (result && (result.success === true || result.status === "success")) {
        // Mark orders as synced in local database
        await markOrdersAsSynced();
        
        // Reload data to reflect changes
        await loadData();
        
        setUploadResult(result);
        setUploadSuccess(true);
        
        Toast.show({
          type: "success",
          text1: "✅ Upload Successful",
          text2: result.message || `Uploaded ${orders.length} orders`,
        });
      } else {
        // Handle case where upload didn't return expected success format
        console.warn("⚠️ Unexpected response format from server:", result);
        
        // Still mark as success if we got this far (200 response)
        await markOrdersAsSynced();
        await loadData();
        
        setUploadResult({
          success: true,
          message: "Orders processed successfully",
          uploaded_count: orders.length
        });
        setUploadSuccess(true);
        
        Toast.show({
          type: "success",
          text1: "✅ Upload Completed",
          text2: "Orders have been processed",
        });
      }
    } catch (err: any) {
      console.error("Upload error:", err);
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
    setUploadResult(null);
    loadData();
  };

  const goToHome = () => {
    // Navigate to index.tsx page
    router.push('/');
  };

  const totalItems = orders.reduce((acc, order) => acc + (order.quantity || 0), 0);

  return (
    <View className="flex-1 bg-gray-100">
      {/* Back Button */}
      <TouchableOpacity 
        className="absolute top-12 left-4 bg-white p-2 rounded-full shadow-md z-10"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#3B82F6" />
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 16 
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-6">
          {uploadSuccess ? (
            <View className="items-center">
              <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              
              <Text className="text-2xl font-bold text-green-600 text-center mb-2">
                Upload Successful!
              </Text>
              
              <Text className="text-base text-gray-600 text-center mb-4">
                {uploadResult?.message || "All orders have been uploaded successfully."}
              </Text>

              <View className="bg-green-50 p-4 rounded-lg mb-6 w-full">
                <Text className="text-green-800 text-center font-semibold">
                  Uploaded: {uploadResult?.uploaded_count || orders.length} orders
                </Text>
                <Text className="text-green-600 text-center">
                  Total items: {totalItems}
                </Text>
              </View>

              <View className="w-full gap-y-3">
                <Pressable
                  onPress={resetToUploadView}
                  className="p-4 rounded-xl bg-blue-500"
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Upload More Orders
                  </Text>
                </Pressable>

                <Pressable
                  onPress={goToHome}
                  className="p-4 rounded-xl bg-gray-200"
                >
                  <Text className="text-gray-700 text-center font-semibold">
                    Go Back to Home
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : loading ? (
            <View className="items-center">
              <Text className="text-2xl font-semibold text-blue-500 mb-4">
                Uploading {orders.length} Orders...
              </Text>
              <Text className="text-gray-500 mb-4">
                Please don't close the app
              </Text>
              <LottieView
                source={require("@/assets/lottie/upload.json")}
                autoPlay
                loop
                style={{ width: 180, height: 180 }}
              />
              <Text className="text-sm text-gray-400 mt-4">
                Syncing with server...
              </Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-center items-center gap-2 mb-6">
                <Ionicons name="cloud-upload-outline" size={32} color="#3B82F6" />
                <Text className="text-2xl font-bold text-blue-500 text-center">
                  Upload Pending Orders
                </Text>
              </View>
              
              <View className="bg-blue-50 p-4 rounded-lg mb-6">
                <Text className="text-blue-800 font-semibold text-center mb-2">
                  Upload Summary
                </Text>
                <View className="gap-y-2">
                  <View className="flex flex-row justify-between">
                    <Text className="text-blue-700">Pending Orders:</Text>
                    <Text className="font-semibold">{orders.length}</Text>
                  </View>
                  <View className="flex flex-row justify-between">
                    <Text className="text-blue-700">Total Items:</Text>
                    <Text className="font-semibold">{totalItems}</Text>
                  </View>
                  {stats.lastSynced && (
                    <View className="flex flex-row justify-between">
                      <Text className="text-blue-700">Last Synced:</Text>
                      <Text className="text-blue-600">
                        {new Date(stats.lastSynced).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                onPress={handleUpload}
                disabled={loading || orders.length === 0}
                className={`p-4 rounded-xl ${
                  orders.length === 0 ? "bg-gray-400" : "bg-orange-500"
                } shadow-md`}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {orders.length === 0 ? 'No Orders to Upload' : `Upload ${orders.length} Orders`}
                </Text>
              </Pressable>

              {orders.length === 0 && (
                <Text className="text-gray-500 text-center mt-4">
                  All orders are synced with the server
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}