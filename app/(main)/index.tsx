import { deleteUserid, getUserid, logout } from "@/utils/auth";
import { clearPairing } from "@/utils/pairing";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

const routes = [
  {
    name: "Download",
    icon: "cloud-download-outline",
    path: "/(main)/download" as const,
    color: "#1E90FF",
    bgColor: "#f4f5f5ff",
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
    name: "Settings",
    icon: "settings-outline",
    path: "/(main)/settings" as const,
    color: "#6366F1",
    bgColor: "#EEF2FF",
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
        <View style={{ alignItems: "center" }}>
          <MaskedView
            style={{ height: 60, width: 200 }}
            maskElement={
              <Text style={styles.navTitleMask}>
                MagicPDA
              </Text>
            }
          >
            <LinearGradient
              colors={['#fbd23cff', '#ee7219ff', '#141becff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            />
          </MaskedView>
          <Text style={styles.navSubheading}>Your Smart PDA</Text>
        </View>
      </View>
      

      {/* Welcome */}
      <View style={styles.welcomeContainer}>
        <LinearGradient
          colors={['#fbd23cff', '#ee7219ff', '#141becff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCardBorder}
        >
          <View style={styles.welcomeCard}>
            <Ionicons 
              name="person-circle-outline" 
              size={28} 
              color="#6B7280" 
              style={styles.userIcon}
            />
            <Text style={styles.welcomeText}>
              Welcome: {username ? username : "User"}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {/* First Row: Download, Entry */}
        <View style={styles.row}>
          <Pressable
            onPress={() => router.push(routes[0].path!)}
            style={styles.card}
          >
            <Ionicons
              name={routes[0].icon as keyof typeof Ionicons.glyphMap}
              size={32}
              color={routes[0].color}
            />
            <Text style={[styles.cardText, { color: routes[0].color }]}>
              {routes[0].name}
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push(routes[1].path!)}
            style={styles.card}
          >
            <Ionicons
              name={routes[1].icon as keyof typeof Ionicons.glyphMap}
              size={32}
              color={routes[1].color}
            />
            <Text style={[styles.cardText, { color: routes[1].color }]}>
              {routes[1].name}
            </Text>
          </Pressable>
        </View>

        {/* Second Row: Upload, Settings */}
        <View style={styles.row}>
          <Pressable
            onPress={() => router.push(routes[2].path!)}
            style={styles.card}
          >
            <Ionicons
              name={routes[2].icon as keyof typeof Ionicons.glyphMap}
              size={32}
              color={routes[2].color}
            />
            <Text style={[styles.cardText, { color: routes[2].color }]}>
              {routes[2].name}
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push(routes[3].path!)}
            style={styles.card}
          >
            <Ionicons
              name={routes[3].icon as keyof typeof Ionicons.glyphMap}
              size={32}
              color={routes[3].color}
            />
            <Text style={[styles.cardText, { color: routes[3].color }]}>
              {routes[3].name}
            </Text>
          </Pressable>
        </View>

        {/* Third Row: Logout (Centered) */}
        <View style={styles.centerRow}>
          <Pressable
            onPress={handleLogout}
            style={styles.card}
          >
            <Ionicons
              name={routes[4].icon as keyof typeof Ionicons.glyphMap}
              size={32}
              color={routes[4].color}
            />
            <Text style={[styles.cardText, { color: routes[4].color }]}>
              {routes[4].name}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Powered by IMC Business Solutions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fcfcfcff",
    paddingTop: 20,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingBottom: 30,
    marginBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    height: 100,
  },
  navTitleMask: {
    fontSize: 38,
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 20,
    backgroundColor: 'transparent',
    textAlign: 'center',
    color: 'black',
  },
  gradientBackground: {
    flex: 1,
  },
  navSubheading: {
    fontSize: 14,
    fontStyle: "italic",
    letterSpacing: 0.5,
    textAlign: "center",
    color: "#1d84c8ff",
    marginTop: 4,
  },
  navTagline: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  welcomeContainer: {
    paddingHorizontal: 20,
    marginBottom: 50,
  },
  welcomeCardBorder: {
    padding: 3, // This creates the border thickness
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  welcomeCard: {
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 27, // Slightly less than border radius
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  userIcon: {
    marginRight: 8,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  welcome: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 50,
    textAlign: "center",
  },
  grid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  centerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  card: {
    width: "47%",
    height: 130,
    borderRadius: 16,
    backgroundColor: "#fafaf6ff",
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
    bottom: 50,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
  },
});