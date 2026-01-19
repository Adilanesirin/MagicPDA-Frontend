import { getPendingGRNOrders } from "@/utils/sync";
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

const grnRoutes = [
  {
    name: "GRN Entry",
    icon: "clipboard-outline",
    path: "/(main)/grn-entry",
    subtitle: "Add GRN items",
    gradient: ["#EC4899", "#DB2777"],
    requiresNoUpload: true,
  },
  {
    name: "GRN Upload",
    icon: "cloud-upload-outline",
    path: "/(main)/grn-upload",
    subtitle: "Sync GRN data",
    gradient: ["#F59E0B", "#D97706"],
    showPending: true,
  },
];

export default function GRNScreen() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState(0);

  const loadPendingCount = async () => {
    try {
      const orders = await getPendingGRNOrders();
      const ordersArray = Array.isArray(orders) ? orders : [];
      
      console.log("📊 Pending GRN orders:", ordersArray.length);
      console.log("📦 Sample GRN order:", ordersArray[0]);
      
      setPendingCount(ordersArray.length);
      
      const totalItems = ordersArray.reduce((acc, order) => {
        const qty = parseInt(order.quantity) || 0;
        console.log(`GRN Order ${order.id}: quantity = ${qty}`);
        return acc + qty;
      }, 0);
      
      console.log("📊 Total pending GRN items:", totalItems);
      setPendingItems(totalItems);
    } catch (error) {
      console.error("Error loading pending GRN count:", error);
      setPendingCount(0);
      setPendingItems(0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPendingCount();
    }, [])
  );

  const handleBack = () => {
    router.back();
  };

  const handleRoutePress = (route: typeof grnRoutes[0]) => {
    if (route.requiresNoUpload && (pendingCount > 0 || pendingItems > 0)) {
      Alert.alert(
        "Upload Pending",
        `You have ${pendingCount > 0 
          ? `${pendingCount} pending ${pendingCount === 1 ? 'GRN' : 'GRNs'}` 
          : `${pendingItems} pending ${pendingItems === 1 ? 'item' : 'items'}`
        } waiting to be uploaded.\n\nPlease upload your pending data before adding new entries.`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Go to Upload",
            onPress: () => router.push("/(main)/grn-upload")
          }
        ]
      );
      return;
    }

    router.push(route.path);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GRN (Goods Receipt Note)</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your GRN workflow
          </Text>
        </View>

        <View style={styles.columnContainer}>
          {grnRoutes.map((route) => {
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
                      color={isBlocked ? "#9CA3AF" : "#2563EB"}
                      style={styles.iconGlow}
                    />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={styles.cardTitle}>{route.name}</Text>
                    <Text style={styles.cardSubtitle}>{route.subtitle}</Text>
                    {isBlocked && (
                      <View style={styles.blockedBadgeContainer}>
                        <View style={styles.blockedBadge}>
                          <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
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
                              ? `Upload pending: ${pendingCount} ${pendingCount === 1 ? 'GRN' : 'GRNs'}`
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

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#EC4899"
          />
          <Text style={styles.infoText}>
            {(pendingCount > 0 || pendingItems > 0) ? (
              <>
                <Text style={styles.bold}>Upload pending GRN data</Text> before adding new entries. 
                Use <Text style={styles.bold}>GRN Upload</Text> to sync with server first.
              </>
            ) : (
              <>
                Use <Text style={styles.bold}>GRN Entry</Text> to add goods receipt items and{" "}
                <Text style={styles.bold}>GRN Upload</Text> to sync with server.
              </>
            )}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by IMC Business Solutions</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "white",
    paddingTop: Platform.OS === "android" ? 55 : 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 50, paddingHorizontal: 20 },
  sectionHeader: { marginTop: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },
  sectionSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
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
    backgroundColor: "rgba(255,255,255,0.9)",
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
    color: "#EF4444",
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
    color: "#DC2626",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F8",
    borderRadius: 19,
    padding: 19,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FBCFE8",
    marginBottom: 20,
  },
  infoText: { fontSize: 13, color: "#374151", flex: 1, lineHeight: 18 },
  bold: { fontWeight: "600", color: "#111827" },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 230,
  },
  footerText: {
    fontSize: 13,
    color: "#6B7280",
    letterSpacing: 0.5,
  },
});