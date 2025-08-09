import { View, Text, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { fetchDownloadData } from "@/utils/download";
import {
  saveMasterData,
  saveProductData,
  getLocalDataStats,
  updateLastSynced,
} from "@/utils/sync";
import Toast from "react-native-toast-message";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DownloadPage() {
  const [loading, setLoading] = useState(false);
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

      Toast.show({
        type: "success",
        text1: "Download Successful",
        text2: "Data saved locally 🎉",
      });
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

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <View className="flex-1 justify-center items-center  px-4">
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
              className="bg-orange-400 rounded-xl py-4 shadow-lg"
            >
              <Text className="text-white font-bold text-lg text-center">
                Download Now
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
