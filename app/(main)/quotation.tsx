// app/(main)/quotation.tsx
import { getPendingQuotations } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const quotationRoutes = [
  {
    name: "Entry",
    icon: "document-text-outline",
    path: "/(main)/quotation-entry",
    subtitle: "Add products",
    requiresNoUpload: true,
  },
  {
    name: "Upload",
    icon: "cloud-upload-outline",
    path: "/(main)/quotation-upload",
    subtitle: "Sync data",
    showPending: true,
  },
];

export default function QuotationScreen() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState(0);

  const headerAnim = useRef(new Animated.Value(-60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(quotationRoutes.map(() => new Animated.Value(50))).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 0, speed: 14, bounciness: 5, useNativeDriver: true,
      }),
      ...cardAnims.map((anim, idx) =>
        Animated.sequence([
          Animated.delay(180 + idx * 120),
          Animated.spring(anim, {
            toValue: 0, speed: 12, bounciness: 8, useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  useEffect(() => {
    if (pendingCount > 0 || pendingItems > 0) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1.06,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(badgePulse, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      badgePulse.setValue(1);
    }

    return () => {
      pulseLoopRef.current?.stop();
    };
  }, [pendingCount, pendingItems]);

  const loadPendingCount = async () => {
    try {
      const quotations = await getPendingQuotations();
      const quotationsArray = Array.isArray(quotations) ? quotations : [];

      setPendingCount(quotationsArray.length);

      const totalItems = quotationsArray.reduce((acc, quotation) => {
        const qty = parseInt(quotation.quantity) || 0;
        return acc + qty;
      }, 0);

      setPendingItems(totalItems);
    } catch (error) {
      console.error("Error loading pending count:", error);
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

  const handleRoutePress = (route: typeof quotationRoutes[0]) => {
    if (route.requiresNoUpload && (pendingCount > 0 || pendingItems > 0)) {
      Alert.alert(
        "Upload Pending",
        `You have ${pendingCount > 0
          ? `${pendingCount} pending ${pendingCount === 1 ? 'quotation' : 'quotations'}`
          : `${pendingItems} pending ${pendingItems === 1 ? 'item' : 'items'}`
        } waiting to be uploaded.\n\nPlease upload your pending data before adding new entries.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Upload", onPress: () => router.push("/(main)/quotation-upload") }
        ]
      );
      return;
    }
    router.push(route.path);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F766E" barStyle="light-content" />

      {/* Gradient Header */}
      <Animated.View style={{ transform: [{ translateY: headerAnim }], opacity: fadeAnim }}>
        <LinearGradient
          colors={["#0F766E", "#14B8A6", "#2DD4BF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Quotation</Text>
            <Text style={styles.headerSubtitle}>What would you like to do?</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Cards */}
      <View style={styles.body}>
        {quotationRoutes.map((route, idx) => {
          const isBlocked = route.requiresNoUpload && (pendingCount > 0 || pendingItems > 0);
          const showPending = route.showPending && (pendingCount > 0 || pendingItems > 0);

          return (
            <Animated.View
              key={route.name}
              style={{ transform: [{ translateY: cardAnims[idx] }], opacity: fadeAnim }}
            >
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleRoutePress(route)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconBox, { backgroundColor: "#F0FDFA" }]}>
                  <Ionicons
                    name={isBlocked ? "lock-closed-outline" : route.icon}
                    size={28}
                    color={isBlocked ? "#9CA3AF" : "#0F766E"}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{route.name}</Text>
                  <Text style={styles.cardDesc}>{route.subtitle}</Text>

                  {isBlocked && (
                    <View style={styles.blockedBadge}>
                      <Ionicons name="alert-circle" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.blockedText}>Upload required first</Text>
                    </View>
                  )}

                  {showPending && (
                    <Animated.View style={{ transform: [{ scale: badgePulse }], alignSelf: "flex-start" }}>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>
                          {pendingCount > 0
                            ? `${pendingCount} pending ${pendingCount === 1 ? 'quotation' : 'quotations'}`
                            : `${pendingItems} pending ${pendingItems === 1 ? 'item' : 'items'}`
                          }
                        </Text>
                      </View>
                    </Animated.View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#0F766E" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#0F766E" />
          <Text style={styles.infoText}>
            {(pendingCount > 0 || pendingItems > 0) ? (
              <>
                <Text style={styles.bold}>Upload pending data</Text> before adding new entries.
              </>
            ) : (
              <>
                Use <Text style={styles.bold}>Entry</Text> to add products and{" "}
                <Text style={styles.bold}>Upload</Text> to sync with server.
              </>
            )}
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>Powered by IMC Business Solutions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8EDF2",
  },
  header: {
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: 32,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1917",
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12,
    color: "#78716C",
  },

  blockedBadge: {
    marginTop: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  blockedText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },

  pendingBadge: {
    marginTop: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pendingText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#99F6E4",
    marginTop: 4,
  },
  infoText: { fontSize: 13, color: "#374151", flex: 1, lineHeight: 18 },
  bold: { fontWeight: "600", color: "#111827" },

  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    paddingBottom: 26,
  },
});