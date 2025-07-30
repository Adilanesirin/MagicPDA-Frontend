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
    <View className="p-6 bg-white flex-1 justify-center space-y-4">
      <Text className="text-2xl font-bold mb-2 text-center text-gray-800">
        Scan Mode Settings
      </Text>

      <Text className="text-base text-gray-500 mb-6 text-center">
        Choose your preferred method for scanning: use the built-in Zebra
        hardware scanner or your phone's camera.
      </Text>

      <TouchableOpacity
        className={`p-4 mb-4 rounded-xl ${
          mode === "hardware" ? "bg-blue-400" : "bg-gray-200"
        }`}
        onPress={() => saveSetting("hardware")}
      >
        <Text
          className={`text-center font-semibold ${
            mode === "hardware" ? "text-white" : "text-gray-800"
          }`}
        >
          Use Zebra Hardware Scanner
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`p-4 rounded-xl ${
          mode === "camera" ? "bg-blue-400" : "bg-gray-200"
        }`}
        onPress={() => saveSetting("camera")}
      >
        <Text
          className={`text-center font-semibold ${
            mode === "camera" ? "text-white" : "text-gray-800"
          }`}
        >
          Use Camera Scanner
        </Text>
      </TouchableOpacity>
    </View>
  );
}
