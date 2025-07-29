// app/upload.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  getPendingOrders,
  markOrdersAsSynced,
  getLocalDataStats,
} from "@/utils/sync";
import { uploadPendingOrders } from "@/utils/upload";

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
      Alert.alert("Nothing to upload", "All entries are already synced.");
      return;
    }

    try {
      setLoading(true);
      const res = await uploadPendingOrders(orders);
      console.log(res);

      await markOrdersAsSynced();
      await loadData();
      Alert.alert("✅ Success", "Orders uploaded successfully.");
    } catch (err: any) {
      console.error(err);
      Alert.alert("❌ Upload Failed", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="p-4 mt-20">
      <Text className="text-2xl font-bold mb-4">Upload Pending Orders</Text>

      <View className="bg-white rounded-xl shadow p-4 mb-4">
        <Text className="text-base font-medium">
          Pending Orders: {orders.length}
        </Text>
        <Text className="text-base">
          Total Items:{" "}
          {orders.reduce((acc, cur) => acc + cur.products.length, 0)}
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Last Synced: {stats.lastSynced || "Never"}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleUpload}
        disabled={loading || orders.length === 0}
        className={`p-4 rounded-xl ${
          orders.length === 0 ? "bg-gray-400" : "bg-green-600"
        }`}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-center font-semibold">Upload</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
