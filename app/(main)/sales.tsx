// app/(main)/sales.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function SalesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#94A3B8" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Sales</Text>
          <Text style={styles.headerSubtitle}>What would you like to do?</Text>
        </View>
      </View>

      {/* Cards */}
      <View style={styles.body}>

        {/* Entry Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/(main)/sales-barcode-entry")}
          activeOpacity={0.85}
        >
          <View style={[styles.iconBox, { backgroundColor: "#ECFDF5" }]}>
            <Ionicons name="create-outline" size={30} color="#10B981" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Entry</Text>
            <Text style={styles.cardDesc}>Create new sales transactions</Text>
          </View>
          <View style={[styles.arrow, { backgroundColor: "#ECFDF5" }]}>
            <Ionicons name="chevron-forward" size={18} color="#10B981" />
          </View>
        </TouchableOpacity>

        {/* Report Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/(main)/sales-report")}
          activeOpacity={0.85}
        >
          <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="bar-chart-outline" size={30} color="#3B82F6" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Report</Text>
            <Text style={styles.cardDesc}>View and analyze sales data</Text>
          </View>
          <View style={[styles.arrow, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
          </View>
        </TouchableOpacity>

      </View>

      {/* Footer */}
      <Text style={styles.footer}>Powered by IMC Business Solutions .V5</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  header: {
    backgroundColor: "#131f3d",
    paddingTop: Platform.OS === "android" ? 55 : 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "400",
  },

  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: Platform.OS === "android" ? 13 : 12,
    paddingBottom: 28,
    fontWeight: "400",
  },
});