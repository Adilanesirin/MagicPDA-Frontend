// app/(main)/sales-return.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function SalesReturnScreen() {
  const router = useRouter();

  const headerAnim = useRef(new Animated.Value(-60)).current;
  const card1Anim = useRef(new Animated.Value(50)).current;
  const card2Anim = useRef(new Animated.Value(50)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 0, speed: 14, bounciness: 5, useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(180),
        Animated.spring(card1Anim, {
          toValue: 0, speed: 12, bounciness: 8, useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(card2Anim, {
          toValue: 0, speed: 12, bounciness: 8, useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#C2410C" barStyle="light-content" />

      {/* Gradient Header */}
      <Animated.View style={{ transform: [{ translateY: headerAnim }], opacity: fadeAnim }}>
        <LinearGradient
          colors={["#EA580C", "#F97316", "#FB923C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Sales Return</Text>
            <Text style={styles.headerSubtitle}>What would you like to do?</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Cards */}
      <View style={styles.body}>

        {/* Entry */}
        <Animated.View style={{ transform: [{ translateY: card1Anim }], opacity: fadeAnim }}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/(main)/sales-return-barcode-entry")}
            activeOpacity={0.85}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="create-outline" size={28} color="#EA580C" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Entry</Text>
              <Text style={styles.cardDesc}>Create new return transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EA580C" />
          </TouchableOpacity>
        </Animated.View>

        {/* Report */}
        <Animated.View style={{ transform: [{ translateY: card2Anim }], opacity: fadeAnim }}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/(main)/sales-return-report")}
            activeOpacity={0.85}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="bar-chart-outline" size={28} color="#EA580C" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Report</Text>
              <Text style={styles.cardDesc}>View and analyze return data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EA580C" />
          </TouchableOpacity>
        </Animated.View>

      </View>

      <Text style={styles.footer}>Powered by IMC Business Solutions .V5</Text>
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
  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    paddingBottom: 26,
  },
});