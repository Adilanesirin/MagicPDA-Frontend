// app/(main)/index.tsx
import { View, Text, Pressable } from "react-native";
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

  const handleLogout = async () => {
    await logout();
    await clearPairing();
    await deleteUserid();
    router.replace("/(auth)/pairing");
  };

  return (
    <View className="flex-1 justify-center items-center bg-white px-4">
      {/* Grid of icons (2 per row) */}
      <View className="flex-wrap flex-row justify-center gap-4">
        {routes.map((route, index) => (
          <Pressable
            key={route.path}
            onPress={() => router.push(route.path)}
            className="w-32 h-32 items-center justify-center bg-gray-100 rounded-xl"
          >
            <Ionicons name={route.icon as any} size={32} color="#007AFF" />
            <Text className="text-sm mt-2 text-center">{route.name}</Text>
          </Pressable>
        ))}
      </View>

      {/* Logout Button */}
      <Pressable
        onPress={handleLogout}
        className="mt-10 px-6 py-3 bg-red-500 rounded-full"
      >
        <Text className="text-white text-base font-semibold">Logout</Text>
      </Pressable>
    </View>
  );
}
