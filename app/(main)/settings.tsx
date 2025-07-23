import { View, Text, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

export default function Settings() {
  const [mode, setMode] = useState<"hardware" | "camera">("hardware");

  useEffect(() => {
    const loadSetting = async () => {
      const saved = await SecureStore.getItemAsync("scanMode");
      if (saved === "camera" || saved === "hardware") {
        setMode(saved);
      }
    };
    loadSetting();
  }, []);

  const saveSetting = async (selected: "hardware" | "camera") => {
    await SecureStore.setItemAsync("scanMode", selected);
    setMode(selected);
  };

  return (
    <View className="p-6">
      <Text className="text-lg font-bold mb-4">Scan Mode Settings</Text>

      <TouchableOpacity
        className={`p-4 mb-4 rounded-xl ${
          mode === "hardware" ? "bg-blue-600" : "bg-gray-300"
        }`}
        onPress={() => saveSetting("hardware")}
      >
        <Text className="text-white font-bold text-center">
          Use Zebra Hardware Scanner
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`p-4 rounded-xl ${
          mode === "camera" ? "bg-blue-600" : "bg-gray-300"
        }`}
        onPress={() => saveSetting("camera")}
      >
        <Text className="text-white font-bold text-center">
          Use Camera Scanner
        </Text>
      </TouchableOpacity>
    </View>
  );
}
