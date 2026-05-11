// app/(main)/stock-taking.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function StockTakingScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardAnim = useRef(new Animated.Value(60)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0369A1" barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={["#0369A1", "#0891B2", "#06B6D4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.ringOuter} />
        <View style={styles.ringInner} />

       {/* Back button — left aligned */}
<Animated.View style={[styles.headerTop, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
  </TouchableOpacity>
</Animated.View>

{/* Icon + Title centered */}
<Animated.View style={[styles.headerCenter, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
  <Animated.View style={{ transform: [{ scale: pulse }] }}>
    <View style={styles.headerIconWrap}>
      <Ionicons name="cube" size={24} color="#FFFFFF" />
    </View>
  </Animated.View>
  <Text style={styles.headerTitle}>STOCK TAKING</Text>
</Animated.View>

{/* Subtitle centered */}
<Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
  <Text style={styles.headerSubtitle}>INVENTORY MANAGEMENT SYSTEM</Text>
</Animated.View>

        <View style={styles.headerWave} />
      </LinearGradient>

      {/* Info strip */}
      <Animated.View style={[styles.infoStrip, { opacity: cardFade, transform: [{ translateY: cardAnim }] }]}>
        <View style={styles.infoItem}>
          <Ionicons name="layers-outline" size={15} color="#0891B2" />
          <Text style={styles.infoText}>Multi-location</Text>
        </View>
        <View style={styles.infoDot} />
        <View style={styles.infoItem}>
          <Ionicons name="barcode-outline" size={15} color="#0891B2" />
          <Text style={styles.infoText}>Barcode Ready</Text>
        </View>
        <View style={styles.infoDot} />
        <View style={styles.infoItem}>
          <Ionicons name="cloud-done-outline" size={15} color="#0891B2" />
          <Text style={styles.infoText}>Sync Enabled</Text>
        </View>
      </Animated.View>

      {/* Section Label */}
      <Animated.View style={{ opacity: cardFade }}>
        <Text style={styles.sectionLabel}>SELECT MODULE</Text>
      </Animated.View>

      {/* Cards */}
      <Animated.View style={[styles.body, { opacity: cardFade, transform: [{ translateY: cardAnim }] }]}>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push("/(main)/stock-barcode")}
        >
          <LinearGradient
            colors={["#0891B2", "#0E7490"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryCard}
          >
            
            <View style={styles.primaryCardContent}>
              <View style={styles.primaryIconWrap}>
                <View style={styles.primaryIconInner}>
                  <Ionicons name="create" size={26} color="#0891B2" />
                </View>
              </View>
              <View style={styles.primaryCardText}>
                <Text style={styles.primaryCardTitle}>Entry</Text>
                <Text style={styles.primaryCardDesc}>Record & submit inventory counts</Text>
              </View>
              <View style={styles.primaryArrow}>
                <Ionicons name="arrow-forward" size={18} color="#0891B2" />
              </View>
            </View>
            <View style={styles.dotGrid}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={styles.dot} />
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>

      <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push("/(main)/stock-upload")}
        >
          <LinearGradient
            colors={["#0E7490", "#0369A1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryCard}
          >
         
            <View style={styles.primaryCardContent}>
              <View style={styles.primaryIconWrap}>
                <View style={styles.primaryIconInner}>
                  <Ionicons name="cloud-upload" size={26} color="#0E7490" />
                </View>
              </View>
              <View style={styles.primaryCardText}>
                <Text style={styles.primaryCardTitle}>Upload</Text>
                <Text style={styles.primaryCardDesc}>Sync & upload pending stock counts</Text>
              </View>
              <View style={styles.primaryArrow}>
                <Ionicons name="arrow-forward" size={18} color="#0E7490" />
              </View>
            </View>
            <View style={styles.dotGrid}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={styles.dot} />
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>
        {/* Report Card — NEW */}
<TouchableOpacity
  activeOpacity={0.88}
  onPress={() => router.push("/(main)/stock-report")}
>
  <LinearGradient
    colors={["#087495", "#0c7ab6"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.primaryCard}
  >
    <View style={styles.primaryCardContent}>
      <View style={styles.primaryIconWrap}>
        <View style={styles.primaryIconInner}>
          <Ionicons name="bar-chart" size={26} color="#0369A1" />
        </View>
      </View>
      <View style={styles.primaryCardText}>
        <Text style={styles.primaryCardTitle}>Report</Text>
        <Text style={styles.primaryCardDesc}>View synced & pending stock records</Text>
      </View>
      <View style={styles.primaryArrow}>
        <Ionicons name="arrow-forward" size={18} color="#126b9b" />
      </View>
    </View>
    <View style={styles.dotGrid}>
      {[...Array(6)].map((_, i) => <View key={i} style={styles.dot} />)}
    </View>
  </LinearGradient>
</TouchableOpacity>

        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={18} color="#0891B2" />
          <Text style={styles.hintText}>
            Use Entry to record stock counts, then Upload to sync them with the server.
          </Text>
        </View>

      </Animated.View>

      <Text style={styles.footer}>Powered by IMC Business Solutions .V5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F9FF",
  },

  header: {
  paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 10 : 54,
  paddingBottom: 30,
  paddingHorizontal: width * 0.06,
  overflow: "hidden",
},
headerTop: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 18,
},
headerCenter: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  marginBottom: 8,
},
headerTitle: {
  fontSize: width * 0.058,
  fontWeight: "800",
  color: "#FFFFFF",
  letterSpacing: 1.5,
},
headerSubtitle: {
  fontSize: width * 0.028,
  color: "rgba(255,255,255,0.75)",
  fontWeight: "600",
  letterSpacing: 1.2,
  textAlign: "center",
},

  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: width * 0.05,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoText: {
    fontSize: width * 0.028,
    color: "#0E7490",
    fontWeight: "600",
  },
  infoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#BAE6FD",
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.8,
    paddingHorizontal: width * 0.06,
    marginTop: 24,
    marginBottom: 12,
  },

  body: {
    paddingHorizontal: width * 0.05,
    gap: 14,
  },

  primaryCard: {
    borderRadius: 11,
    padding: 11,
    overflow: "hidden",
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  
  primaryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  primaryIconWrap: {
    width: width * 0.14,
    height: width * 0.145,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  primaryIconInner: {
    width: width * 0.115,
    height: width * 0.115,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCardText: {
    flex: 1,
  },
  primaryCardTitle: {
    fontSize: width * 0.052,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  primaryCardDesc: {
    fontSize: width * 0.031,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "400",
    lineHeight: width * 0.045,
  },
  primaryArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dotGrid: {
    flexDirection: "row",
    gap: 5,
    marginTop: 18,
    opacity: 0.25,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ede6e6",
  },

  hintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E0F7FA",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#06B6D4",
  },
  hintText: {
    flex: 1,
    fontSize: width * 0.03,
    color: "#0E7490",
    fontWeight: "400",
    lineHeight: width * 0.045,
  },

  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: width * 0.03,
    paddingBottom: Platform.OS === "android" ? 24 : 34,
    marginTop: "auto",
    fontWeight: "400",
  },
});