import { fetchDownloadData } from "@/utils/download";
import {
  getLocalDataStats,
  saveMasterData,
  saveProductData,
  updateLastSynced,
} from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export default function DownloadPage() {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [masterCount, setMasterCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const loadStats = async () => {
    const stats = await getLocalDataStats();
    setMasterCount(stats.masterCount);
    setProductCount(stats.productCount);
    setLastSynced(stats.lastSynced);
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const data = await fetchDownloadData();
      console.log("✅ Data fetched:", {
        master: data.master_data?.length,
        product: data.product_data?.length,
      });

      await saveMasterData(data.master_data);
      await saveProductData(data.product_data);

      await updateLastSynced();
      await loadStats();

      setDownloadComplete(true);
      setShowSuccess(true);
      // Auto hide success card after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Download Failed",
        text2: "Please try again later",
      });
      //console.error("Download error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <View className="flex-1 justify-center items-center px-4">
      {/* Back Button */}
      <View className="absolute top-12 left-4 z-10">
        <Pressable
          onPress={handleBack}
    
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
      </View>

      {/* Success Card Overlay */}
      {showSuccess && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center z-20 px-4">
          <View className="bg-white rounded-2xl p-8 shadow-xl max-w-[320px] w-full items-center">
            <View className="bg-green-100 rounded-full p-4 mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">
              Download Successful!
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Data saved locally 🎉
            </Text>
            <Pressable
              onPress={() => setShowSuccess(false)}
              className="bg-green-500 rounded-xl py-3 px-8"
            >
              <Text className="text-white font-semibold">
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className="w-full max-w-[360px] bg-white rounded-2xl shadow-lg p-6">
        {loading ? (
          <View className="items-center">
            <Text className="text-2xl font-semibold text-blue-400 mb-2">
              Downloading...
            </Text>
            <LottieView
              source={require("@/assets/lottie/download.json")}
              autoPlay
              loop
              style={{ width: 180, height: 180 }}
            />
          </View>
        ) : (
          <>
            {/* Header */}
            <View className="flex-row justify-center items-center gap-2 mb-6">
              <Ionicons
                name="cloud-download-outline"
                size={28}
                color="#60A5FA"
              />
              <Text className="text-2xl font-bold text-blue-400 text-center">
                Download The Data
              </Text>
            </View>
            <View className="gap-y-4 mb-8">
              <Text className="text-base text-gray-700">
                📦 <Text className="font-semibold">Master Data:</Text>{" "}
                {masterCount}
              </Text>
              <Text className="text-base text-gray-700">
                🛍 <Text className="font-semibold">Product Data:</Text>{" "}
                {productCount}
              </Text>
              <Text className="text-sm text-gray-500">
                🕒 <Text className="font-medium">Last Synced:</Text>{" "}
                {lastSynced ? new Date(lastSynced).toLocaleString() : "Never"}
              </Text>
            </View>
            <Pressable
              onPress={handleDownload}
              disabled={downloadComplete || loading}
              className={`rounded-xl py-4 shadow-lg ${
                downloadComplete
                  ? "bg-gray-300"
                  : loading
                  ? "bg-orange-300"
                  : "bg-orange-400"
              }`}
            >
              <Text className={`font-bold text-lg text-center ${
                downloadComplete ? "text-gray-500" : "text-white"
              }`}>
                {downloadComplete ? "✓ Downloaded" : loading ? "Downloading..." : "Download Now"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}