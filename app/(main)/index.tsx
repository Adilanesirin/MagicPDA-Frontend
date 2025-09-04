import { deleteUserid, getUserid, logout } from "@/utils/auth";
import { clearPairing } from "@/utils/pairing";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

const routes = [
  {
    name: "Download",
    icon: "cloud-download-outline",
    path: "/(main)/download" as const,
    description: "Get your files",
    gradient: ['#3B82F6', '#1E40AF'],
  },
  {
    name: "Entry",
    icon: "document-text-outline",
    path: "/(main)/entry" as const,
    description: "Create entries",
    gradient: ['#10B981', '#059669'],
  },
  {
    name: "Upload",
    icon: "cloud-upload-outline",
    path: "/(main)/upload" as const,
    description: "Share your files",
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    name: "Settings",
    icon: "settings-outline",
    path: "/(main)/settings" as const,
    description: "Manage account",
    gradient: ['#8B5CF6', '#7C3AED'],
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
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <MaskedView
              style={styles.logoMask}
              maskElement={
                <Text style={styles.logoText}>MagicPDA</Text>
              }
            >
              <LinearGradient
                colors={['#fbd23c', '#ee7219', '#141bec']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              />
            </MaskedView>
           <MaskedView
              style={styles.subtitleMask}
              maskElement={
                <Text style={styles.subtitleText}>
                  Your Smart PDA - Making productivity magical
                </Text>
            }
          >
            <LinearGradient
              colors={['#f0770dff', '#ee7219', '#141bec']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
            </MaskedView>
          </View>
          
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={24} color="#e02222ff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeCard}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#fbd23c', '#ee7219']}
                style={styles.avatarGradient}
              >
                <Ionicons name="person" size={24} color="white" />
              </LinearGradient>
            </View>
            <View style={styles.welcomeText}>
              <Text style={styles.greetingText}>Welcome back!</Text>
              <Text style={styles.usernameText}>
                {username || "User"}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>
            Choose what you'd like to do
          </Text>
        </View>

        {/* Modern Grid */}
        <View style={styles.gridContainer}>
          {routes.map((route, index) => (
            <Pressable
              key={route.name}
              onPress={() => router.push(route.path)}
              style={({ pressed }) => [
                styles.gridItem,
                pressed && styles.gridItemPressed
              ]}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={route.gradient}
                    style={styles.iconGradient}
                  >
                    <Ionicons
                      name={route.icon as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color="white"
                    />
                  </LinearGradient>
                </View>
                
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>{route.name}</Text>
                  <Text style={styles.cardDescription}>
                    {route.description}
                  </Text>
                </View>
                
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color="#C7C7CC" 
                />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Powered by IMC Business Solutions
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  
  header: {
    backgroundColor: "white",
    paddingTop: Platform.OS === 'android' ? 60 : 50,
    paddingBottom: Platform.OS === 'android' ? 30 : 25,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  
  logoContainer: {
    flex: 1,
    alignItems: "flex-start",
    paddingTop: Platform.OS === 'android' ? 5 : 1,
  },
  
  logoMask: {
    height: Platform.OS === 'android' ? 40 : 35,
    width: Platform.OS === 'android' ? 180 : 160,
    marginBottom: Platform.OS === 'android' ? 6 : 4,
  },
  
  logoText: {
    fontSize: Platform.OS === 'android' ? 32 : 30,
    fontWeight: "800",
    letterSpacing: 1,
    backgroundColor: 'transparent',
    textAlign: 'center',
    color: 'black',
    marginRight: 20,
    paddingTop: Platform.OS === 'android' ? 2 : 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  
  subtitleMask: {
    height: Platform.OS === 'android' ? 20 : 16,
    width: '100%',
  },
  
  subtitleText: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    fontWeight: "500",
    marginTop: Platform.OS === 'android' ? 0 : 2,
    backgroundColor: 'transparent',
    color:'black',
    paddingTop: Platform.OS === 'android' ? 0 : 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  
  gradientBackground: {
    flex: 1,
  },
  
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: 30,
  },
  
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 30,
  },
  
  welcomeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  
  avatarContainer: {
    marginRight: 16,
  },
  
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  
  welcomeText: {
    flex: 1,
  },
  
  greetingText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 2,
  },
  
  usernameText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  
  sectionSubtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  
  gridContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  
  gridItem: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  
  gridItemPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  
  iconContainer: {
    marginRight: 16,
  },
  
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  
  cardTextContainer: {
    flex: 1,
  },
  
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  
  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  
  footer: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: Platform.OS === 'android' ? 14 : 13,
    marginTop: 60,
    fontWeight: "400",
    includeFontPadding: false,
  },
});