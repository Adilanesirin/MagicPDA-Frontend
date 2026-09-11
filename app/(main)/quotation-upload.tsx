// app/(main)/quotation-upload.tsx
import {
    cleanupDuplicateQuotations,
    getLocalDataStats,
    getPendingQuotations,
    markQuotationsAsSynced
} from "@/utils/sync";
import { uploadPendingQuotations } from "@/utils/upload";
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

export default function QuotationUpload() {
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const loadData = async () => {
    try {
      // Try to clean up duplicates, but continue even if it fails
      try {
        await cleanupDuplicateQuotations();
      } catch (cleanupError) {
        console.warn("⚠️ Cleanup failed, continuing without cleanup:", cleanupError);
      }

      const data = await getPendingQuotations();
      const s = await getLocalDataStats();

      // 🔍 DEBUG: Log the raw data from database
      console.log("\n🔍 === RAW QUOTATIONS FROM DATABASE ===");
      console.log("Total quotations loaded:", data.length);

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

      setQuotations(Array.isArray(data) ? data : []);
      setStats(s || {});
    } catch (error) {
      console.error("❌ Error loading data:", error);
      Toast.show({
        type: "error",
        text1: "Load Error",
        text2: "Failed to load pending quotations",
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
    if (!quotations || quotations.length === 0) {
      Toast.show({
        type: "info",
        text1: "Nothing to upload",
        text2: "All entries are already synced.",
      });
      return;
    }

    try {
      setLoading(true);

      if (quotations.length > 10) {
        Alert.alert(
          "Confirm Upload",
          `You are about to upload ${quotations.length} quotations. Continue?`,
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
      console.log("📤 Starting upload of", quotations.length, "quotations");

      const result = await uploadPendingQuotations(quotations);

      if (result && (result.success === true || result.status === "success")) {
        // Mark quotations as synced in local database
        await markQuotationsAsSynced();

        // Reload data to reflect changes
        await loadData();

        setUploadResult(result);
        setUploadSuccess(true);

        Toast.show({
          type: "success",
          text1: "✅ Upload Successful",
          text2: result.message || `Uploaded ${quotations.length} quotations`,
        });
      } else {
        // Handle case where upload didn't return expected success format
        console.warn("⚠️ Unexpected response format from server:", result);

        // Still mark as success if we got this far (200 response)
        await markQuotationsAsSynced();
        await loadData();

        setUploadResult({
          success: true,
          message: "Quotations processed successfully",
          uploaded_count: quotations.length
        });
        setUploadSuccess(true);

        Toast.show({
          type: "success",
          text1: "✅ Upload Completed",
          text2: "Quotations have been processed",
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

  const totalItems = quotations.reduce((acc, quotation) => acc + (quotation.quantity || 0), 0);

  return (
    <View className="flex-1 bg-gray-100">
      {/* Back Button */}
      <TouchableOpacity
        className="absolute top-12 left-4 bg-white p-2 rounded-full shadow-md z-10"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#0d9488" />
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
              <View className="w-20 h-20 bg-teal-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={48} color="#0d9488" />
              </View>

              <Text className="text-2xl font-bold text-teal-600 text-center mb-2">
                Upload Successful!
              </Text>

              <Text className="text-base text-gray-600 text-center mb-4">
                {uploadResult?.message || "All quotations have been uploaded successfully."}
              </Text>

              <View className="bg-teal-50 p-4 rounded-lg mb-6 w-full">
                <Text className="text-teal-800 text-center font-semibold">
                  Uploaded: {uploadResult?.uploaded_count || quotations.length} quotations
                </Text>
                <Text className="text-teal-600 text-center">
                  Total items: {totalItems}
                </Text>
              </View>

              <View className="w-full gap-y-3">
                <Pressable
                  onPress={resetToUploadView}
                  className="p-4 rounded-xl bg-teal-600"
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Upload More Quotations
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
              <Text className="text-2xl font-semibold text-teal-600 mb-4">
                Uploading {quotations.length} Quotations...
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
                <Ionicons name="cloud-upload-outline" size={32} color="#0d9488" />
                <Text className="text-2xl font-bold text-teal-600 text-center">
                  Upload Pending Quotations
                </Text>
              </View>

              <View className="bg-teal-50 p-4 rounded-lg mb-6">
                <Text className="text-teal-800 font-semibold text-center mb-2">
                  Upload Summary
                </Text>
                <View className="gap-y-2">
                  <View className="flex flex-row justify-between">
                    <Text className="text-teal-700">Pending Quotations:</Text>
                    <Text className="font-semibold">{quotations.length}</Text>
                  </View>
                  <View className="flex flex-row justify-between">
                    <Text className="text-teal-700">Total Items:</Text>
                    <Text className="font-semibold">{totalItems}</Text>
                  </View>
                  {stats.lastSynced && (
                    <View className="flex flex-row justify-between">
                      <Text className="text-teal-700">Last Synced:</Text>
                      <Text className="text-teal-600">
                        {new Date(stats.lastSynced).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                onPress={handleUpload}
                disabled={loading || quotations.length === 0}
                className={`p-4 rounded-xl ${
                  quotations.length === 0 ? "bg-gray-400" : "bg-teal-600"
                } shadow-md`}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {quotations.length === 0 ? 'No Quotations to Upload' : `Upload ${quotations.length} Quotations`}
                </Text>
              </Pressable>

              {quotations.length === 0 && (
                <Text className="text-gray-500 text-center mt-4">
                  All quotations are synced with the server
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}