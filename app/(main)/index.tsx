// app/(main)/index.tsx
import { deleteUserid, getUserid, logout } from "@/utils/auth";
import { clearPairing } from "@/utils/pairing";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

export default function HomeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [licenseType, setLicenseType] = useState<string | null>(null);
  const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);
  const [demoDaysRemaining, setDemoDaysRemaining] = useState<string | null>(null);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [licenseModules, setLicenseModules] = useState<string[]>([]);
  const [userModules, setUserModules] = useState<string[]>([]);


  useEffect(() => {
  const fetchUserData = async () => {
    const user = await getUserid();
    setUsername(user);

    const raw = await AsyncStorage.getItem("allowed_modules");
    const parsedLicenseModules: string[] = JSON.parse(raw || "[]");
    setLicenseModules(parsedLicenseModules);

    const moreoptions = await AsyncStorage.getItem("user_moreoptions");

    let parsedUserModules: string[] = [];
    let finalModules: string[] = [];

    if (moreoptions && moreoptions.trim() !== "") {
      parsedUserModules = moreoptions.match(/##(.*?)##/g)
        ?.map((code: string) => code.replace(/##/g, "")) || [];
      finalModules = parsedLicenseModules.filter(mod => parsedUserModules.includes(mod));
    }

    setUserModules(parsedUserModules);
    setAllowedModules(finalModules);
    
    // ✅ NEW: Load demo license data
    const type = await AsyncStorage.getItem("licenseType");
    setLicenseType(type);
    
    if (type === "DEMO") {
      const expires = await AsyncStorage.getItem("demoExpiresAt");
      const days = await AsyncStorage.getItem("demoDaysRemaining");
      setDemoExpiresAt(expires);
      setDemoDaysRemaining(days);
    }
  };

  fetchUserData();
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
            
            // Clear any additional AsyncStorage login flags
            try {
              await AsyncStorage.removeItem("userLoggedIn");
            } catch (e) {
              console.log("Error clearing AsyncStorage:", e);
            }
            
            router.replace("/(auth)/login");
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

    const showComingSoon = (moduleName: string) => {
    Alert.alert(
      "🚧 Oops!",
      `${moduleName} is Under Construction.\n\nComing Soon!`,
      [{ text: "OK" }]
    );
  };
 const getModuleStatus = (moduleCode: string): "allowed" | "not_licensed" | "no_privilege" => {
    const inLicense = licenseModules.includes(moduleCode);
    const inUser = userModules.includes(moduleCode);
    if (!inLicense) return "not_licensed";
    if (inLicense && inUser) return "allowed";
    return "no_privilege";
  };

  const handleModulePress = (moduleCode: string, onAllowed: () => void) => {
    const status = getModuleStatus(moduleCode);
    if (status === "allowed") {
      onAllowed();
    } else if (status === "not_licensed") {
      Alert.alert(
        "🔒 Module Not Purchased",
        "You have not purchased this module.\nPlease contact your server vendor.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "⛔ Insufficient Privilege",
        "You do not have permission to access this module.",
        [{ text: "OK" }]
      );
    }
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
                <Text style={styles.logoText}>TaskPMS</Text>
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
                  Your Smart PMS - Making productivity magical
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
              
              {/* ✅ NEW: Demo License Info */}
              {licenseType === "DEMO" && (
                <View style={styles.demoInfoContainer}>
                  <View style={styles.demoBadge}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" />
                    <Text style={styles.demoText}>DEMO MODE</Text>
                  </View>
                  <Text style={styles.demoExpiryText}>
                    Expires: {demoExpiresAt} ({demoDaysRemaining} days left)
                  </Text>
                </View>
              )}
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

        {/* Grid Container */}
        <View style={styles.gridContainer}>

          {/* First Row - Orders & GRN */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 }}>
           <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD004") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD004", () => router.push("/(main)/orders"))}
            >

              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="receipt-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>P.Orders</Text>
                  <Text style={styles.cardDescription}>Entry & Upload</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD003") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD003", () => router.push("/(main)/grn"))}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#EC4899', '#DB2777']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="clipboard-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>GRN</Text>
                  <Text style={styles.cardDescription}>Goods Receipt</Text>
                </View>
              </View>
            </TouchableOpacity>
          
                    
            <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD025") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD025", () => router.push("/(main)/purchase-return"))}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="return-up-back-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Purchase Return</Text>
                  <Text style={styles.cardDescription}>Return Items</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push("/(main)/download")}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#3B82F6', '#1E40AF']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="cloud-download-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Download</Text>
                  <Text style={styles.cardDescription}>Sync Data</Text>
                </View>
              </View>
            </TouchableOpacity>
                    
            <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD005") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD005", () => router.push("/(main)/tracker"))}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="analytics-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Tracker</Text>
                  <Text style={styles.cardDescription}>Track Progress</Text>
                </View>
              </View>
            </TouchableOpacity>
            

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push("/(main)/settings")}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="settings-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Settings</Text>
                  <Text style={styles.cardDescription}>App Settings</Text>
                </View>
              </View>
            </TouchableOpacity>
                    
            <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD026") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD026", () => router.push("/(main)/sales"))}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#131f3d', '#131f3d']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="cart-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Sales</Text>
                  <Text style={styles.cardDescription}>Manage Sales</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD027") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD027", () => showComingSoon("Sales Return"))}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#F97316', '#EA580C']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="arrow-undo-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Sales Return</Text>
                  <Text style={styles.cardDescription}>Return Sales</Text>
                </View>
              </View>
            </TouchableOpacity>
          

            <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD028") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD028", () => showComingSoon("Point Redeem"))}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="gift-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Point Redeem</Text>
                  <Text style={styles.cardDescription}>Redeem Points</Text>
                </View>
              </View>
            </TouchableOpacity>
          

            <TouchableOpacity
              style={[styles.gridItem, !allowedModules.includes("MOD006") && styles.gridItemLocked]}
              onPress={() => handleModulePress("MOD006", () => showComingSoon("Stock Taking"))}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#06B6D4', '#0891B2']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="cube-outline" size={32} color="white" />
                  </LinearGradient>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Stock Taking</Text>
                  <Text style={styles.cardDescription}>Inventory Count</Text>
                </View>
              </View>
            </TouchableOpacity>
            


          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Powered by IMC Business Solutions .V5
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
    shadowOpacity: 0.19,
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
    marginBottom: 20,
  },
  
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  
  gridItem: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    width: '47%',
    height: 140,
  },

  gridItemLocked: {
    opacity: 0.45,
  },
  
  gridItemPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  
  cardContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  
  iconContainer: {
    marginBottom: 12,
  },
  
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  
  cardTextContainer: {
    alignItems: "center",
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },
  
  cardDescription: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  
  footer: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: Platform.OS === 'android' ? 14 : 13,
    marginTop: 40,
    fontWeight: "400",
    includeFontPadding: false,
  },

  demoInfoContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
  },

  demoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 4,
  },

  demoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  demoExpiryText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
    marginTop: 2,
  },
});