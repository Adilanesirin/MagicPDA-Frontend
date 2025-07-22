import { View, Text, ActivityIndicator, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { fetchDownloadData } from "@/utils/download";
import {
  saveMasterData,
  saveProductData,
  getLocalDataStats,
  updateLastSynced,
} from "@/utils/sync";

export default function DownloadPage() {
  const [loading, setLoading] = useState(false);
  const [masterCount, setMasterCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const router = useRouter();

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

      await saveMasterData(data.master_data);
      await saveProductData(data.product_data);

      await updateLastSynced();
      await loadStats();

      setLoading(false);
      Alert.alert("Success", "Data downloaded and saved locally.");
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to download data.");
      console.error("Download error:", error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 px-4">
      <View className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <Text className="text-3xl font-bold text-center text-gray-800 mb-6">
          Download The Data
        </Text>

        <View className="mb-6 space-y-4">
          <Text className="text-base text-gray-700 mb-2">
            📦 <Text className="font-semibold">Master Data:</Text> {masterCount}
          </Text>
          <Text className="text-base text-gray-700 mb-2">
            🛍 <Text className="font-semibold">Product Data:</Text>{" "}
            {productCount}
          </Text>
          <Text className="text-sm text-gray-500">
            🕒 <Text className="font-medium">Last Synced:</Text>{" "}
            {lastSynced ? new Date(lastSynced).toLocaleString() : "Never"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007aff" />
        ) : (
          <Pressable
            onPress={handleDownload}
            className="bg-blue-600 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              Download Now
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => router.push("/(main)")}
        className="mt-20 bg-gray-300 px-6 py-3 rounded-lg"
      >
        <Text className="text-gray-800 font-medium">Back to Home</Text>
      </Pressable>
    </View>
  );
}
