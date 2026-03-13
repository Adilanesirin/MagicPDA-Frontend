import { getPendingReturns } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const returnRoutes = [
  {
    name: "Entry",
    icon: "return-up-back-outline",
    path: "/(main)/purchase-return-entry",
    subtitle: "Add return items",
    gradient: ["#7f3232", "#7f3232"],
    requiresNoUpload: true,
  },
  {
    name: "Upload",
    icon: "cloud-upload-outline",
    path: "/(main)/purchase-return-upload",
    subtitle: "Sync return data",
    gradient: ["#17789b", "#17789b"],
    showPending: true,
  },
];

export default function PurchaseReturnScreen() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState(0);

  const loadPendingCount = async () => {
    try {
      const returns = await getPendingReturns();
      const returnsArray = Array.isArray(returns) ? returns : [];
      
      console.log("📊 Pending returns:", returnsArray.length);
      console.log("📦 Sample return:", returnsArray[0]);
      
      setPendingCount(returnsArray.length);
      
      // Calculate total items - sum up all quantities
      const totalItems = returnsArray.reduce((acc, returnItem) => {
        const qty = parseInt(returnItem.quantity) || 0;
        console.log(`Return ${returnItem.id}: quantity = ${qty}`);
        return acc + qty;
      }, 0);
      
      console.log("📊 Total pending return items:", totalItems);
      setPendingItems(totalItems);
    } catch (error) {
      console.error("Error loading pending return count:", error);
      setPendingCount(0);
      setPendingItems(0);
    }
  };

  // Refresh pending count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPendingCount();
    }, [])
  );

  const handleBack = () => {
    router.back();
  };

  const handleRoutePress = (route: typeof returnRoutes[0]) => {
    // Check if this route requires no pending uploads
    if (route.requiresNoUpload && (pendingCount > 0 || pendingItems > 0)) {
      Alert.alert(
        "Upload Pending",
        `You have ${pendingCount > 0 
          ? `${pendingCount} pending ${pendingCount === 1 ? 'return' : 'returns'}` 
          : `${pendingItems} pending ${pendingItems === 1 ? 'item' : 'items'}`
        } waiting to be uploaded.\n\nPlease upload your pending data before adding new return entries.`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Go to Upload",
            onPress: () => router.push("/(main)/purchase-return-upload")
          }
        ]
      );
      return;
    }

    // Navigate to the route
    router.push(route.path);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#DC2626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Return</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Return Actions</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your purchase return workflow
          </Text>
        </View>

        {/* Vertical Card List */}
        <View style={styles.columnContainer}>
          {returnRoutes.map((route) => {
            const isBlocked = route.requiresNoUpload && (pendingCount > 0 || pendingItems > 0);
            
            return (
              <Pressable
                key={route.name}
                onPress={() => handleRoutePress(route)}
                style={({ pressed }) => [
                  styles.vCard,
                  isBlocked && styles.vCardBlocked,
                  pressed && !isBlocked && { transform: [{ scale: 0.97 }], shadowOpacity: 0.15 },
                ]}
              >
                <LinearGradient
                  colors={isBlocked ? ["#9CA3AF", "#6B7280"] : route.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.vCardInner}
                >
                  {isBlocked && (
                    <View style={styles.blockedOverlay}>
                      <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.9)" />
                    </View>
                  )}
                  <View style={styles.iconWrapper}>
                    <Ionicons
                      name={route.icon}
                      size={34}
                      color={isBlocked ? "#9CA3AF" : "#EF4444"}
                      style={styles.iconGlow}
                    />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={styles.cardTitle}>{route.name}</Text>
                    <Text style={styles.cardSubtitle}>{route.subtitle}</Text>
                    {isBlocked && (
                      <View style={styles.blockedBadgeContainer}>
                        <View style={styles.blockedBadge}>
                          <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.blockedText}>
                            Upload required first
                          </Text>
                        </View>
                      </View>
                    )}
                    {route.showPending && (pendingCount > 0 || pendingItems > 0) && (
                      <View style={styles.pendingBadgeContainer}>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>
                            {pendingCount > 0 
                              ? `Upload pending: ${pendingCount} ${pendingCount === 1 ? 'return' : 'returns'}`
                              : `Upload pending: ${pendingItems} ${pendingItems === 1 ? 'item' : 'items'}`
                            }
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* Info Banner - Updated text */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#DC2626"
          />
          <Text style={styles.infoText}>
            {(pendingCount > 0 || pendingItems > 0) ? (
              <>
                <Text style={styles.bold}>Upload pending return data</Text> before adding new entries. 
                Use <Text style={styles.bold}>Upload</Text> to sync with server first.
              </>
            ) : (
              <>
                Use <Text style={styles.bold}>Entry</Text> to add return items and{" "}
                <Text style={styles.bold}>Upload</Text> to sync with server.
              </>
            )}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by IMC Business Solutions</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffefe" },

  header: {
    backgroundColor: "white",
    paddingTop: Platform.OS === "android" ? 55 : 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#7F1D1D" },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 50, paddingHorizontal: 20 },

  sectionHeader: { marginTop: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#7F1D1D" },
  sectionSubtitle: { fontSize: 14, color: "#991B1B", marginTop: 4 },

  columnContainer: {
    flexDirection: "column",
    gap: 20,
    marginBottom: 30,
  },

  vCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  vCardBlocked: {
    opacity: 0.85,
  },
  vCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    minHeight: 110,
    borderRadius: 15,
    position: 'relative',
  },

  blockedOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },

  iconWrapper: {
    backgroundColor: "rgb(255, 255, 255)",
    padding: 16,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0000006f",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  iconGlow: {
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
  },

  blockedBadgeContainer: {
    marginTop: 8,
  },
  blockedBadge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blockedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },

  pendingBadgeContainer: {
    marginTop: 8,
  },
  pendingBadge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 19,
    padding: 19,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 20,
  },
  infoText: { fontSize: 13, color: "#991B1B", flex: 1, lineHeight: 18 },
  bold: { fontWeight: "600", color: "#7F1D1D" },

  footer: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 230,
  },
  footerText: {
    fontSize: 13,
    color: "#8c8484",
    letterSpacing: 0.5,
  },
});