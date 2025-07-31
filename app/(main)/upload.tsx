// app/upload.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import {
  getPendingOrders,
  markOrdersAsSynced,
  getLocalDataStats,
} from "@/utils/sync";
import { uploadPendingOrders } from "@/utils/upload";
import Toast from "react-native-toast-message";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Upload() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  const loadData = async () => {
    const data = await getPendingOrders();
    const s = await getLocalDataStats();
    setOrders(data);
    setStats(s);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async () => {
    if (orders.length === 0) {
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

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Orders uploaded successfully.",
      });
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

  return (
    <View className="flex-1 justify-center items-center px-4">
      <View className="w-full max-w-[360px] bg-white rounded-2xl shadow-lg p-6">
        {loading ? (
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
                  Total Items:{" "}
                  {orders.reduce((acc, cur) => acc + cur.products.length, 0)}
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
