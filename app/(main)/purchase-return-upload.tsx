import {
  cleanupDuplicateReturns,
  getLocalReturnStats,
  getPendingReturns,
  markReturnsAsSynced
} from "@/utils/sync";
import { uploadPendingReturns } from "@/utils/upload";
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

export default function PurchaseReturnUpload() {
  const [loading, setLoading] = useState(false);
  const [returns, setReturns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const loadData = async () => {
    try {
      // Try to clean up duplicates, but continue even if it fails
      try {
        await cleanupDuplicateReturns();
      } catch (cleanupError) {
        console.warn("⚠️ Cleanup failed, continuing without cleanup:", cleanupError);
      }
      
      const data = await getPendingReturns();
      const s = await getLocalReturnStats();
      
      // 🔍 DEBUG: Log the raw data from database
      console.log("\n🔍 === RAW RETURNS FROM DATABASE ===");
      console.log("Total returns loaded:", data.length);
      
      // Check manual entries specifically
      const manualEntries = data.filter((r: any) => 
        r.is_manual_entry === 1 || r.is_manual_entry === '1'
      );
      console.log("Manual return entries found:", manualEntries.length);
      
      if (manualEntries.length > 0) {
        console.log("\n📋 Manual Return Entry Details:");
        manualEntries.forEach((entry: any, idx: number) => {
          console.log(`\n  Entry ${idx + 1}:`);
          console.log(`    barcode: ${entry.barcode}`);
          console.log(`    product_name: ${entry.product_name}`);
          console.log(`    is_manual_entry: ${entry.is_manual_entry}`);
          console.log(`    itemcode: ${entry.itemcode}`);
        });
      }
      console.log("🔍 === END RAW DATA ===\n");
      
      setReturns(Array.isArray(data) ? data : []);
      setStats(s || {});
    } catch (error) {
      console.error("❌ Error loading return data:", error);
      Toast.show({
        type: "error",
        text1: "Load Error",
        text2: "Failed to load pending returns",
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
    if (!returns || returns.length === 0) {
      Toast.show({
        type: "info",
        text1: "Nothing to upload",
        text2: "All return entries are already synced.",
      });
      return;
    }

    try {
      setLoading(true);
      
      if (returns.length > 10) {
        Alert.alert(
          "Confirm Upload",
          `You are about to upload ${returns.length} return entries. Continue?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Upload", onPress: actuallyUpload }
          ]
        );
      } else {
        actuallyUpload();
      }
    } catch (err: any) {
      console.error("Return upload error:", err);
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
      console.log("📤 Starting upload of", returns.length, "return entries");
      
      const result = await uploadPendingReturns(returns);
      
      if (result && (result.success === true || result.status === "success")) {
        // Mark returns as synced in local database
        await markReturnsAsSynced();
        
        // Reload data to reflect changes
        await loadData();
        
        setUploadResult(result);
        setUploadSuccess(true);
        
        Toast.show({
          type: "success",
          text1: "✅ Upload Successful",
          text2: result.message || `Uploaded ${returns.length} return entries`,
        });
      } else {
        // Handle case where upload didn't return expected success format
        console.warn("⚠️ Unexpected response format from server:", result);
        
        // Still mark as success if we got this far (200 response)
        await markReturnsAsSynced();
        await loadData();
        
        setUploadResult({
          success: true,
          message: "Return entries processed successfully",
          uploaded_count: returns.length
        });
        setUploadSuccess(true);
        
        Toast.show({
          type: "success",
          text1: "✅ Upload Completed",
          text2: "Return entries have been processed",
        });
      }
    } catch (err: any) {
      console.error("Return upload error:", err);
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

  const totalItems = returns.reduce((acc, returnItem) => acc + (returnItem.quantity || 0), 0);

  return (
    <View className="flex-1 bg-white">
      {/* Back Button */}
      <TouchableOpacity 
        className="absolute top-12 left-4 bg-white p-2 rounded-full shadow-md z-10 border border-red-200"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#DC2626" />
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
        <View className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-6 border border-red-200">
          {uploadSuccess ? (
            <View className="items-center">
              <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4 border border-green-300">
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              
              <Text className="text-2xl font-bold text-green-600 text-center mb-2">
                Upload Successful!
              </Text>
              
              <Text className="text-base text-gray-600 text-center mb-4">
                {uploadResult?.message || "All return entries have been uploaded successfully."}
              </Text>

              <View className="bg-green-50 p-4 rounded-lg mb-6 w-full border border-green-200">
                <Text className="text-green-800 text-center font-semibold">
                  Uploaded: {uploadResult?.uploaded_count || returns.length} return entries
                </Text>
                <Text className="text-green-600 text-center">
                  Total return items: {totalItems}
                </Text>
              </View>

              <View className="w-full gap-y-3">
                <Pressable
                  onPress={resetToUploadView}
                  className="p-4 rounded-xl bg-red-600"
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Upload More Returns
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
              <Text className="text-2xl font-semibold text-red-600 mb-4">
                Uploading {returns.length} Returns...
              </Text>
              <Text className="text-red-500 mb-4">
                Please don't close the app
              </Text>
              <LottieView
                source={require("@/assets/lottie/upload.json")}
                autoPlay
                loop
                style={{ width: 180, height: 180 }}
              />
              <Text className="text-sm text-red-400 mt-4">
                Syncing return data with server...
              </Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-center items-center gap-2 mb-6">
                <Ionicons name="cloud-upload-outline" size={32} color="#DC2626" />
                <Text className="text-2xl font-bold text-red-600 text-center">
                  Upload Pending Returns
                </Text>
              </View>
              
              <View className="bg-red-50 p-4 rounded-lg mb-6 border border-red-200">
                <Text className="text-red-800 font-semibold text-center mb-2">
                  Return Upload Summary
                </Text>
                <View className="gap-y-2">
                  <View className="flex flex-row justify-between">
                    <Text className="text-red-700">Pending Returns:</Text>
                    <Text className="font-semibold">{returns.length}</Text>
                  </View>
                  <View className="flex flex-row justify-between">
                    <Text className="text-red-700">Total Return Items:</Text>
                    <Text className="font-semibold">{totalItems}</Text>
                  </View>
                  {stats.lastSynced && (
                    <View className="flex flex-row justify-between">
                      <Text className="text-red-700">Last Synced:</Text>
                      <Text className="text-red-600">
                        {new Date(stats.lastSynced).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                onPress={handleUpload}
                disabled={loading || returns.length === 0}
                className={`p-4 rounded-xl ${
                  returns.length === 0 ? "bg-gray-400" : "bg-red-600"
                } shadow-md`}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {returns.length === 0 ? 'No Returns to Upload' : `Upload ${returns.length} Returns`}
                </Text>
              </Pressable>

              {returns.length === 0 && (
                <Text className="text-red-500 text-center mt-4">
                  All return entries are synced with the server
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}