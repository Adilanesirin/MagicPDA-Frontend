import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
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
    color: "#1E90FF",
    bgColor: "#E6F3FF",
  },
  {
    name: "Upload",
    icon: "cloud-upload-outline",
    path: "/(main)/upload" as const,
    color: "#FF8C00",
    bgColor: "#FFF4E6",
  },
  {
    name: "Entry",
    icon: "document-text-outline",
    path: "/(main)/entry" as const,
    color: "#10B981",
    bgColor: "#E0F7F1",
  },
  {
    name: "Settings",
    icon: "settings-outline",
    path: "/(main)/settings" as const,
    color: "#8B5CF6",
    bgColor: "#F3E8FF",
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
      <Text className="text-orange-400" style={styles.welcome}>
        Welcome {username ? username : "User"} 👋
      </Text>

      {/* Grid */}
      <View style={styles.grid}>
        {routes.map((route) => (
          <Pressable
            key={route.path}
            onPress={() => router.push(route.path)}
            style={[
              styles.card,
              { backgroundColor: route.bgColor, shadowColor: route.color },
            ]}
          >
            <Ionicons
              name={route.icon as keyof typeof Ionicons.glyphMap}
              size={32}
              color={route.color}
            />
            <Text style={[styles.cardText, { color: route.color }]}>
              {route.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Logout Button (Square & Centered) */}
      {/* Logout */}
      <View style={{ alignItems: "center", marginTop: 30 }}>
        <Pressable
          onPress={handleLogout}
          style={[styles.card, styles.logoutCard]}
        >
          <Ionicons name="log-out-outline" size={32} color="#FF3B30" />
          <Text style={[styles.cardText, { color: "#FF3B30" }]}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 50,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 18,
  },
  card: {
    width: "47%",
    height: 130,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardText: {
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  logoutCard: {
    backgroundColor: "#FFE5E5",
    width: 130,
    height: 130,
  },
});
