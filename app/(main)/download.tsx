import { View, Text, Button, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { fetchDownloadData } from "@/utils/download";
import { saveMasterData, saveProductData } from "@/utils/sync";
import { logMasterData, logProductData } from "@/utils/debug";

export default function DownloadPage() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const data = await fetchDownloadData();

      // save to SQLite
      await saveMasterData(data.master_data);
      await saveProductData(data.product_data);

      setLoading(false);
      Alert.alert("Success", "Data downloaded and saved locally.");
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to download data.");
      console.error("Download error:", error);
    }
  };
  return (
    <View className="flex-1 justify-center items-center bg-white px-6">
      <Text className="text-2xl font-bold mb-5">Download Data</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007aff" />
      ) : (
        <Button title="Download Now" onPress={handleDownload} />
      )}
    </View>
  );
}
