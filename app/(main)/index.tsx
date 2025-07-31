import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logout, getUserid, deleteUserid } from "@/utils/auth";
import { clearPairing } from "@/utils/pairing";
import Toast from "react-native-toast-message";
import { StatusBar } from "react-native";

const routes = [
  {
    name: "Download",
    icon: "cloud-download-outline",
    path: "/(main)/download" as const,
    color: "#1E90FF",
    bgColor: "#E6F3FF",
  },

  {
    name: "Entry",
    icon: "document-text-outline",
    path: "/(main)/entry" as const,
    color: "#10B981",
    bgColor: "#E0F7F1",
  },
  {
    name: "Upload",
    icon: "cloud-upload-outline",
    path: "/(main)/upload" as const,
    color: "#FF8C00",
    bgColor: "#FFF4E6",
  },
  {
    name: "Logout",
    icon: "log-out-outline",
    color: "#FF3B30",
    action: "logout",
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
            Toast.show({
              type: "success",
              text1: "Logged out successfully",
              visibilityTime: 3000,
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FB923C" barStyle="light-content" />

      {/* Top Nav Bar */}
      <View style={styles.navBar}>
        <View style={{ width: 24 }} />
        <Text style={styles.navTitle}>IMCSync</Text>
        <Pressable onPress={() => router.push("/(main)/settings")}>
          <Ionicons name="settings-outline" size={24} color="#374151" />
        </Pressable>
      </View>

      {/* Welcome */}
      <Text style={styles.welcome}>
        Welcome: {username ? username : "User"}
      </Text>

      {/* Grid */}
      <View style={styles.grid}>
        {routes.map((route, index) => (
          <Pressable
            key={index}
            onPress={
              route.action === "logout"
                ? handleLogout
                : () => router.push(route.path!)
            }
            style={styles.card}
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

      {/* Footer */}
      <Text style={styles.footer}>Powered by IMC Business Solutions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 20,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  welcome: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 50,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    gap: 16,
  },
  card: {
    width: "47%",
    height: 130,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardText: {
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
  },
});
