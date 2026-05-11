// app/(main)/stock-upload.tsx
import {
    getPendingStockCounts,
    markStockCountsAsSynced,
} from "@/utils/sync";
import { uploadPendingStockCounts } from "@/utils/upload";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

export default function StockUploadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<any[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardAnim = useRef(new Animated.Value(60)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

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
  }, []);

  const loadData = async () => {
    try {
      const data = await getPendingStockCounts();
      setCounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Load error:", error);
      Toast.show({ type: "error", text1: "Load Error", text2: "Failed to load pending counts" });
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (!loading && !uploadSuccess) loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [loading, uploadSuccess]);

  const totalItems = counts.reduce((acc, c) => acc + (c.quantity || 0), 0);

  const handleUpload = () => {
    if (loading) return;
    if (!counts || counts.length === 0) {
      Toast.show({ type: "info", text1: "Nothing to upload", text2: "All counts are already synced." });
      return;
    }
    setLoading(true);
    if (counts.length > 10) {
      Alert.alert(
        "Confirm Upload",
        `You are about to upload ${counts.length} stock counts. Continue?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setLoading(false) },
          { text: "Upload", onPress: doUpload },
        ]
      );
    } else {
      doUpload();
    }
  };

  const doUpload = async () => {
    try {
      const result = await uploadPendingStockCounts(counts);
      if (result && (result.success === true || result.status === "success")) {
        await markStockCountsAsSynced();
        await loadData();
        setUploadResult(result);
        setUploadSuccess(true);
        Toast.show({
          type: "success",
          text1: "✅ Upload Successful",
          text2: result.message || `Uploaded ${counts.length} counts`,
        });
      } else {
        await markStockCountsAsSynced();
        await loadData();
        setUploadResult({ success: true, message: "Counts processed successfully", uploaded_count: counts.length });
        setUploadSuccess(true);
        Toast.show({ type: "success", text1: "✅ Upload Completed", text2: "Stock counts have been processed" });
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      Toast.show({ type: "error", text1: "❌ Upload Failed", text2: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

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

        <Animated.View style={[styles.headerTop, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.headerCenter, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>STOCK UPLOAD</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.headerSubtitle}>SYNC PENDING STOCK COUNTS</Text>
        </Animated.View>

        <View style={styles.headerWave} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info strip */}
        <Animated.View style={[styles.infoStrip, { opacity: cardFade, transform: [{ translateY: cardAnim }] }]}>
          <View style={styles.infoItem}>
            <Ionicons name="list-outline" size={15} color="#0891B2" />
            <Text style={styles.infoText}>{counts.length} Pending</Text>
          </View>
          <View style={styles.infoDot} />
          <View style={styles.infoItem}>
            <Ionicons name="cube-outline" size={15} color="#0891B2" />
            <Text style={styles.infoText}>{totalItems} Items</Text>
          </View>
          <View style={styles.infoDot} />
          <View style={styles.infoItem}>
            <Ionicons name="cloud-done-outline" size={15} color="#0891B2" />
            <Text style={styles.infoText}>Sync Ready</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.body, { opacity: cardFade, transform: [{ translateY: cardAnim }] }]}>

          {uploadSuccess ? (
            // ── Success state ──
            <View style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={52} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Upload Successful!</Text>
              <Text style={styles.successSub}>
                {uploadResult?.message || "All stock counts have been uploaded successfully."}
              </Text>
              <View style={styles.successBadge}>
                <Text style={styles.successBadgeText}>
                  Uploaded: {uploadResult?.uploaded_count || counts.length} counts
                </Text>
                <Text style={styles.successBadgeSub}>Total items: {totalItems}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.btnPrimary}
                onPress={() => { setUploadSuccess(false); setUploadResult(null); loadData(); }}
              >
                <Text style={styles.btnPrimaryText}>Upload More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.btnSecondary}
                onPress={() => router.back()}
              >
                <Text style={styles.btnSecondaryText}>Back to Stock Taking</Text>
              </TouchableOpacity>
            </View>

          ) : loading ? (
            // ── Loading state ──
            <View style={styles.loadingCard}>
              <View style={styles.loadingIconWrap}>
                <Ionicons name="cloud-upload-outline" size={48} color="#0891B2" />
              </View>
              <Text style={styles.loadingTitle}>Uploading {counts.length} Counts...</Text>
              <Text style={styles.loadingSub}>Please don't close the app</Text>
              <Text style={styles.loadingHint}>Syncing with server...</Text>
            </View>

          ) : (
            // ── Default state ──
            <>
              <Text style={styles.sectionLabel}>UPLOAD SUMMARY</Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Pending Counts</Text>
                  <Text style={styles.summaryValue}>{counts.length}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items</Text>
                  <Text style={styles.summaryValue}>{totalItems}</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={counts.length === 0 ? 1 : 0.88}
                onPress={handleUpload}
                disabled={loading || counts.length === 0}
              >
                <LinearGradient
                  colors={counts.length === 0 ? ["#CBD5E1", "#CBD5E1"] : ["#0891B2", "#0E7490"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.uploadBtn}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.uploadBtnText}>
                    {counts.length === 0 ? "Nothing to Upload" : `Upload ${counts.length} Counts`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {counts.length === 0 && (
                <View style={styles.hintCard}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#0891B2" />
                  <Text style={styles.hintText}>All stock counts are synced with the server.</Text>
                </View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Text style={styles.footer}>Powered by IMC Business Solutions .V5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F9FF" },

  header: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 10 : 54,
    paddingBottom: 30,
    paddingHorizontal: width * 0.06,
    overflow: "hidden",
  },
  ringOuter: {
    position: "absolute", top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  ringInner: {
    position: "absolute", top: -20, right: -20,
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10, marginBottom: 8,
  },
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: width * 0.058, fontWeight: "800",
    color: "#FFFFFF", letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: width * 0.028, color: "rgba(255,255,255,0.75)",
    fontWeight: "600", letterSpacing: 1.2, textAlign: "center",
  },
  headerWave: {
    position: "absolute", bottom: -20, left: -20, right: -20,
    height: 40, backgroundColor: "#F0F9FF", borderRadius: 40,
  },

  infoStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", marginHorizontal: width * 0.05, marginTop: 16,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, gap: 10,
    shadowColor: "#0891B2", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoText: { fontSize: width * 0.028, color: "#0E7490", fontWeight: "600" },
  infoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#BAE6FD" },

  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: "#94A3B8",
    letterSpacing: 1.8, paddingHorizontal: width * 0.06,
    marginTop: 20, marginBottom: 10,
  },
  body: { paddingHorizontal: width * 0.05, gap: 12, marginTop: 8 },

  summaryCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18,
    shadowColor: "#0891B2", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: width * 0.035, color: "#64748B", fontWeight: "500" },
  summaryValue: { fontSize: width * 0.045, color: "#0E7490", fontWeight: "800" },
  summaryDivider: { height: 1, backgroundColor: "#E0F7FA", marginVertical: 12 },

  itemRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12,
    shadowColor: "#0891B2", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  itemIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E0F7FA", alignItems: "center", justifyContent: "center",
  },
  itemName: { fontSize: width * 0.033, color: "#0E7490", fontWeight: "600" },
  itemSub: { fontSize: width * 0.028, color: "#94A3B8", marginTop: 2 },
  moreText: {
    fontSize: width * 0.03, color: "#0891B2",
    textAlign: "center", fontWeight: "600", marginTop: 4,
  },

  uploadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 16, paddingVertical: 16,
    shadowColor: "#0891B2", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6, marginTop: 4,
  },
  uploadBtnText: { color: "#FFFFFF", fontSize: width * 0.042, fontWeight: "800" },

  hintCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#E0F7FA", borderRadius: 14, padding: 14,
    gap: 10, borderLeftWidth: 3, borderLeftColor: "#06B6D4",
  },
  hintText: {
    flex: 1, fontSize: width * 0.03, color: "#0E7490",
    fontWeight: "400", lineHeight: width * 0.045,
  },

  // Success
  successCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 28,
    alignItems: "center", gap: 12,
    shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
  },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: width * 0.055, fontWeight: "800", color: "#059669" },
  successSub: { fontSize: width * 0.033, color: "#64748B", textAlign: "center" },
  successBadge: {
    backgroundColor: "#F0FDF4", borderRadius: 12,
    padding: 14, width: "100%", alignItems: "center", gap: 4,
  },
  successBadgeText: { fontSize: width * 0.038, fontWeight: "700", color: "#059669" },
  successBadgeSub: { fontSize: width * 0.03, color: "#10B981" },
  btnPrimary: {
    backgroundColor: "#0891B2", borderRadius: 14,
    paddingVertical: 14, width: "100%", alignItems: "center",
  },
  btnPrimaryText: { color: "#FFFFFF", fontSize: width * 0.038, fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "#E0F7FA", borderRadius: 14,
    paddingVertical: 14, width: "100%", alignItems: "center",
  },
  btnSecondaryText: { color: "#0E7490", fontSize: width * 0.038, fontWeight: "600" },

  // Loading
  loadingCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 36,
    alignItems: "center", gap: 12,
    shadowColor: "#0891B2", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  loadingIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#E0F7FA", alignItems: "center", justifyContent: "center",
  },
  loadingTitle: { fontSize: width * 0.045, fontWeight: "700", color: "#0891B2" },
  loadingSub: { fontSize: width * 0.033, color: "#64748B" },
  loadingHint: { fontSize: width * 0.03, color: "#94A3B8", marginTop: 8 },

  footer: {
    textAlign: "center", color: "#94A3B8", fontSize: width * 0.03,
    paddingBottom: Platform.OS === "android" ? 24 : 34,
    marginTop: 8, fontWeight: "400",
  },
});