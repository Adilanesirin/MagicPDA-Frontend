import { View, Text, Pressable, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logout, getUserid, deleteUserid } from "@/utils/auth";
import { clearPairing } from "@/utils/pairing";

const routes = [
  {
    name: "Download",
    icon: "cloud-download-outline",
    path: "/(main)/download" as const,
  },
  {
    name: "Upload",
    icon: "cloud-upload-outline",
    path: "/(main)/upload" as const,
  },
  {
    name: "Entry",
    icon: "document-text-outline",
    path: "/(main)/entry" as const,
  },
  {
    name: "Settings",
    icon: "settings-outline",
    path: "/(main)/settings" as const,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      const user = await getUserid();
      setUsername(user);
    };

    fetchUsername();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Do you want to Logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            await clearPairing();
            await deleteUserid();
            router.replace("/(auth)/pairing");
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      {/* Top Welcome Text */}
      <Text className="text-2xl font-semibold text-gray-800 mb-40">
        Welcome {username ? username : "User"} 👋
      </Text>

      {/* 2x2 Grid of Main Buttons */}
      <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
        {routes.map((route) => (
          <Pressable
            key={route.path}
            onPress={() => router.push(route.path)}
            className="w-[47%] h-32 items-center justify-center bg-blue-100 rounded-xl"
          >
            <Ionicons name={route.icon as any} size={32} color="#007AFF" />
            <Text className="text-sm mt-2 text-center font-medium text-blue-900">
              {route.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Logout Button (Square & Centered) */}
      <View className="items-center">
        <Pressable
          onPress={handleLogout}
          className="w-32 h-32 items-center justify-center bg-red-100 rounded-xl"
        >
          <Ionicons name="log-out-outline" size={32} color="#FF3B30" />
          <Text className="text-sm mt-2 text-center font-medium text-red-600">
            Logout
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
