import {
  clearDownloadArtifacts,
  downloadWithRetry,
  getDownloadStatus,
  resetDownloadState
} from "@/utils/download";
import {
  getLocalDataStats,
  updateLastSynced
} from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import LottieView from "lottie-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export default function DownloadPage() {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [masterCount, setMasterCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  
  // Progress tracking states
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [downloadedMaster, setDownloadedMaster] = useState(0);
  const [downloadedProducts, setDownloadedProducts] = useState(0);

  const loadStats = async () => {
    try {
      const stats = await getLocalDataStats();
      setMasterCount(stats.masterCount);
      setProductCount(stats.productCount);
      setLastSynced(stats.lastSynced);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const resetDownloadUIState = () => {
    setLoading(false);
    setShowSuccess(false);
    setDownloadProgress(0);
    setCurrentStep("");
    setDownloadedMaster(0);
    setDownloadedProducts(0);
  };

  const updateProgress = (progress: number, step: string, masterCount = 0, productCount = 0) => {
    setDownloadProgress(Math.min(progress, 100));
    setCurrentStep(step);
    setDownloadedMaster(masterCount);
    setDownloadedProducts(productCount);
  };

  const prepareForDownload = async () => {
    try {
      console.log("🧹 Preparing for fresh download...");
      updateProgress(5, "Preparing download...");
      await resetDownloadState();
      await clearDownloadArtifacts();
      updateProgress(10, "Ready to download");
      console.log("✅ Download state reset successful");
    } catch (err) {
      console.warn("⚠️ Error preparing download:", err);
    }
  };

  const checkAuthBeforeDownload = async () => {
    try {
      updateProgress(15, "Checking authentication...");
      const accessToken = await SecureStore.getItemAsync('token') || 
                          await SecureStore.getItemAsync('access_token');
      
      console.log("🔐 Download auth check:", {
        hasToken: !!await SecureStore.getItemAsync('token'),
        hasAccessToken: !!await SecureStore.getItemAsync('access_token'),
        finalToken: accessToken ? `EXISTS (${accessToken.length} chars)` : 'NOT FOUND'
      });
      
      if (!accessToken) {
        throw new Error("Please login to download data");
      }
      updateProgress(20, "Authentication verified");
      return true;
    } catch (error) {
      console.error("❌ Authentication check failed:", error);
      throw error;
    }
  };

  const handleDownload = async () => {
    try {
      resetDownloadUIState();
      setLoading(true);
      
      // Check authentication first
      await checkAuthBeforeDownload();
      
      // Always clear download artifacts before starting any download
      await prepareForDownload();
      
      console.log("🚀 Starting download process...");
      updateProgress(25, "Starting download...");
      
      // Simulate progress updates during download
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev < 85) {
            const increment = Math.random() * 10 + 5;
            const newProgress = Math.min(prev + increment, 85);
            
            if (newProgress > 30 && newProgress <= 50) {
              setCurrentStep("Downloading master data...");
            } else if (newProgress > 50 && newProgress <= 75) {
              setCurrentStep("Downloading product data...");
            } else if (newProgress > 75) {
              setCurrentStep("Processing data...");
            }
            
            return newProgress;
          }
          return prev;
        });
      }, 800);

      const result = await downloadWithRetry();
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
      // Get actual counts from the result
      const masterCountResult = result.masterData?.length || 0;
      const productCountResult = result.productData?.length || 0;
      const totalDownloaded = masterCountResult + productCountResult;
      
      updateProgress(90, "Saving data locally...", masterCountResult, productCountResult);
      
      // Debug logging
      console.log("📊 Download result details:", {
        hasResult: !!result,
        hasMasterData: !!result.masterData,
        hasProductData: !!result.productData,
        masterCount: masterCountResult,
        productCount: productCountResult,
        totalDownloaded,
        resultKeys: result ? Object.keys(result) : 'no result'
      });
      
      console.log("✅ Data downloaded successfully:", {
        master: masterCountResult,
        product: productCountResult,
        total: totalDownloaded
      });

      // Update sync timestamp first
      updateProgress(95, "Updating sync status...");
      await updateLastSynced();
      
      // Reload stats from database to get the actual stored counts
      await loadStats();
      
      // Complete progress
      updateProgress(100, "Download complete!");
      
      // Brief delay to show completion
      setTimeout(() => {
        // Set success state
        setShowSuccess(true);
      }, 500);
      
      // Show info toast only if no records were downloaded
      if (totalDownloaded === 0) {
        console.warn("⚠️ Download completed but no records were returned");
        Toast.show({
          type: "info",
          text1: "Download Complete",
          text2: "No new records available from server",
          visibilityTime: 4000,
        });
      }
      
    } catch (error: any) {
      console.error("❌ Download failed:", error.message);
      handleDownloadError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadError = (error: any) => {
    resetDownloadUIState();
    
    let errorMessage = "Please try again";
    const msg = error?.message?.toLowerCase() || "";
    
    if (msg.includes('login') || msg.includes('authentication') || msg.includes('token')) {
      errorMessage = "Please login first, then try downloading";
    } else if (msg.includes('timeout') || msg.includes('timed out')) {
      errorMessage = "Download timed out. Check your internet connection.";
    } else if (msg.includes('network')) {
      errorMessage = "Network error. Check your internet connection.";
    } else if (msg.includes('server error')) {
      errorMessage = "Server issue. Try again in a few minutes.";
    } else if (msg.includes('too many requests')) {
      errorMessage = "Too many requests. Wait 30 seconds and try again.";
    } else if (msg.includes('endpoints not found')) {
      errorMessage = "Server endpoints not found. Check server configuration.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    Toast.show({
      type: "error",
      text1: "Download Failed",
      text2: errorMessage,
      visibilityTime: 6000,
    });
  };

  const handleBack = () => {
    resetDownloadUIState();
    router.back();
  };

  const handleSuccessOk = () => {
    setShowSuccess(false);
    // Navigate to index.tsx page
    router.push('/');
  };

  useEffect(() => {
    resetDownloadUIState();
    loadStats();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setShowSuccess(false);
      loadStats();
    }, [])
  );

  const downloadStatus = getDownloadStatus();

  return (
    <View className="flex-1 justify-center items-center px-4 bg-gray-100">
      <View className="absolute top-12 left-4 z-10">
        <Pressable onPress={handleBack} className="p-2">
          <Ionicons name="arrow-back" size={28} color="#374151" />
        </Pressable>
      </View>

      {/* Success Overlay */}
      {showSuccess && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center z-20 px-4">
          <View className="bg-white rounded-2xl p-8 shadow-xl max-w-[320px] w-full items-center">
            <View className="bg-green-100 rounded-full p-4 mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">
              Download Successful!
            </Text>
            <Text className="text-gray-600 text-center mb-4">Data saved locally</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              Master: {masterCount} | Products: {productCount}
            </Text>
            <Pressable
              onPress={handleSuccessOk}
              className="bg-green-500 rounded-xl py-3 px-8 w-full"
            >
              <Text className="text-white font-semibold text-center text-lg">OK</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className="w-full max-w-[360px] bg-white rounded-2xl shadow-lg p-6">
        {loading ? (
          <View className="items-center">
            <Text className="text-2xl font-semibold text-blue-500 mb-2">
              {loading && !showSuccess ? "Downloading..." : "Processing..."}
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              This may take a few moments
            </Text>
            
            {/* Progress Bar */}
            <View className="w-full mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm text-gray-600">{currentStep}</Text>
                <Text className="text-sm font-semibold text-blue-600">
                  {Math.round(downloadProgress)}%
                </Text>
              </View>
              <View className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ 
                    width: `${downloadProgress}%`,
                    backgroundColor: '#3B82F6',
                    borderRadius: 6
                  }}
                />
              </View>
            </View>

            {/* Progress Stats */}
            {(downloadedMaster > 0 || downloadedProducts > 0) && (
              <View className="w-full mb-4 p-3 bg-blue-50 rounded-lg">
                <Text className="text-center text-sm text-blue-700 mb-1">Downloaded</Text>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-blue-600">
                    📦 Master: {downloadedMaster.toLocaleString()}
                  </Text>
                  <Text className="text-xs text-blue-600">
                    🛒 Products: {downloadedProducts.toLocaleString()}
                  </Text>
                </View>
                <Text className="text-center text-xs text-blue-500 mt-1">
                  Total: {(downloadedMaster + downloadedProducts).toLocaleString()}
                </Text>
              </View>
            )}
            
            <LottieView
              source={require("@/assets/lottie/download.json")}
              autoPlay
              loop
              style={{ width: 180, height: 180 }}
            />
            {downloadStatus.isInProgress && (
              <Text className="text-xs text-gray-400 mt-2">Download in progress...</Text>
            )}
          </View>
        ) : (
          <>
            <View className="flex-row justify-center items-center gap-2 mb-6">
              <Ionicons name="cloud-download-outline" size={32} color="#3B82F6" />
              <Text className="text-3xl font-bold text-blue-500 text-center">Download Data</Text>
            </View>
            
            <View className="gap-y-4 mb-8">
              <Text className="text-lg text-gray-700 text-center">
                📦 <Text className="font-bold">Master:</Text> {masterCount.toLocaleString()}
              </Text>
              <Text className="text-lg text-gray-700 text-center">
                🛒 <Text className="font-bold">Products:</Text> {productCount.toLocaleString()}
              </Text>
              <Text className="text-sm text-gray-500 text-center">
                🕒 <Text className="font-medium">Last Synced:</Text>{" "}
                {lastSynced ? new Date(lastSynced).toLocaleString() : "Never"}
              </Text>
            </View>

            {/* Download Button */}
            <Pressable
              onPress={handleDownload}
              disabled={loading}
              className={`rounded-2xl py-6 shadow-lg mb-4 ${
                loading ? "bg-blue-300" : "bg-blue-500"
              }`}
            >
              <Text className="font-bold text-xl text-center text-white">
                {loading ? "Downloading..." : "Download Data"}
              </Text>
              <Text className="text-blue-100 text-center text-sm mt-1">
                Tap to sync latest data
              </Text>
            </Pressable>

            {/* Error Display */}
            {downloadStatus.lastError && (
              <View className="p-3 bg-red-50 rounded-lg border border-red-200">
                <Text className="text-red-600 text-sm">
                  ⚠️ Last Error: {downloadStatus.lastError}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}