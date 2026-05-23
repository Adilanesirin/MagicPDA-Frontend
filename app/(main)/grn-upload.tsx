import {
  getLocalGRNDataStats,
  getPendingGRNOrders,
  markGRNOrdersAsSynced
} from "@/utils/sync";
import { uploadPendingGRNOrders } from "@/utils/upload";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getDatabase } from "@/utils/database";
import LottieView from "lottie-react-native";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

const convertUTCtoIST = (utcDateString: string): Date => {
  const utcDate = new Date(utcDateString);
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(utcDate.getTime() + istOffset);
};

const saveToReportsHistory = async (rawResponse?: any) => {
  try {
    const responseStr = rawResponse ? JSON.stringify(rawResponse) : ''; console.log('SAVE_RESP:', responseStr.substring(0,120));

    await getDatabase().execAsync(`
      CREATE TABLE IF NOT EXISTS grn_reports_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL,
        barcode TEXT NOT NULL,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        rate REAL NOT NULL,
        mrp REAL NOT NULL,
        grn_date TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        is_manual_entry INTEGER DEFAULT 0,
        server_response TEXT DEFAULT ''
      );
    `);
    try { await getDatabase().execAsync(`ALTER TABLE grn_reports_history ADD COLUMN server_response TEXT DEFAULT ''`); } catch { }

    const syncedData = await getDatabase().getAllAsync(
      `SELECT * FROM grn_to_sync WHERE sync_status = 'synced'`
    ) as any[];

    let savedCount = 0;
    let skippedCount = 0;

    for (const record of syncedData) {
      const exists = await getDatabase().getFirstAsync(
        `SELECT id FROM grn_reports_history WHERE supplier_code = ? AND barcode = ? AND grn_date = ? AND uploaded_at = ?`,
        [record.supplier_code, record.barcode, record.grn_date, record.created_at]
      );

      // Always update server_response for existing records too
        if (exists && responseStr) { await getDatabase().runAsync(`UPDATE grn_reports_history SET server_response = ? WHERE supplier_code = ? AND barcode = ? AND grn_date = ?`, [responseStr, record.supplier_code, record.barcode, record.grn_date]); skippedCount++; } else if (!exists) {
        await getDatabase().runAsync(
          `INSERT INTO grn_reports_history (supplier_code, barcode, product_name, quantity, rate, mrp, grn_date, uploaded_at, is_manual_entry, server_response)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.supplier_code, record.barcode, record.product_name || '', record.quantity, record.rate, record.mrp, record.grn_date, record.created_at, record.is_manual_entry || 0, responseStr]
        );
        savedCount++;
      } else if (responseStr) {
        await getDatabase().runAsync(
          `UPDATE grn_reports_history SET server_response = ? WHERE supplier_code = ? AND barcode = ? AND grn_date = ?`,
          [responseStr, record.supplier_code, record.barcode, record.grn_date]
        );
        skippedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ GRN history saved: ${savedCount} new, ${skippedCount} updated`);
  } catch (error) {
    console.error("ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Error saving to reports history:", error);
  }
};

export default function GRNUpload() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [serverResponse, setServerResponse] = useState<any>(null);
  const [showResponseAlert, setShowResponseAlert] = useState(false);

  const loadData = async () => {
    try {
      const data = await getPendingGRNOrders();
      const s = await getLocalGRNDataStats();
      setOrders(Array.isArray(data) ? data : []);
      setStats(s || {});
    } catch (error) {
      console.error("Error loading GRN data:", error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (!loading && !uploadSuccess) loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async () => {
    if (!orders || orders.length === 0) {
      Toast.show({ type: "info", text1: "Nothing to upload", text2: "All GRN entries are already synced." });
      return;
    }

    try {
      setLoading(true);
      const result = await uploadPendingGRNOrders(orders);

      // Only mark as synced when the server confirmed success
      if (result && result.success === true) {
        await markGRNOrdersAsSynced();
        await saveToReportsHistory(result.rawResponse);
        await loadData();

        setUploadResult(result);
        setUploadSuccess(true);
        setServerResponse(result.rawResponse || null);
        setShowResponseAlert(true);

        Toast.show({ type: "success", text1: "Upload Successful", text2: result.message || `Uploaded ${orders.length} GRN orders` });
      }
    } catch (err: any) {
      console.error("Upload error:", err);

      // ✅ Session expired — clear token and go to login
      if (err.code === "SESSION_EXPIRED" || err.message?.toLowerCase().includes("session expired")) {
        Toast.show({
          type: "error",
          text1: "Session Expired",
          text2: "Please login again to continue.",
          visibilityTime: 3000,
        });
        // Give toast time to show before navigating
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 1500);
        return;
      }

      Toast.show({ type: "error", text1: "Upload Failed", text2: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const resetToUploadView = () => {
    setUploadSuccess(false);
    setUploadResult(null);
    setServerResponse(null);
    setShowResponseAlert(false);
    loadData();
  };

  const goToHome = () => router.push('/');

  const totalItems = orders.reduce((acc, order) => acc + (parseInt(order.quantity) || 0), 0);

  const getFormattedLastSynced = () => {
    if (!stats.lastSynced) return null;
    try {
      const istDate = convertUTCtoIST(stats.lastSynced);
      return istDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return new Date(stats.lastSynced).toLocaleString();
    }
  };

  return (
    <View className="flex-1 bg-gray-100">
      <TouchableOpacity
        className="absolute top-12 left-4 bg-white p-2 rounded-full shadow-md z-10"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#3B82F6" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-6">
          {uploadSuccess ? (
            <View className="items-center">
              <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>

              <Text className="text-2xl font-bold text-green-600 text-center mb-2">
                GRN Upload Successful!
              </Text>

              <Text className="text-base text-gray-600 text-center mb-4">
                {uploadResult?.message || "All GRN orders have been uploaded successfully."}
              </Text>

              <View className="bg-green-50 p-4 rounded-lg mb-4 w-full">
                <Text className="text-green-800 text-center font-semibold">
                  Uploaded: {uploadResult?.uploaded_count || orders.length} GRN orders
                </Text>
                <Text className="text-green-600 text-center">Total items: {totalItems}</Text>
                <Text className="text-green-600 text-center text-sm mt-2">Saved to reports history</Text>
              </View>

              {showResponseAlert && serverResponse && (
                <View style={{ backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, marginBottom: 16, width: '100%' }}>
                  <Text style={{ color: '#4ade80', fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
                    Server Response:
                  </Text>
                  <Text style={{ color: '#e2e8f0', fontSize: 11 }} selectable>
                    {(() => { try { return JSON.stringify(JSON.parse(typeof serverResponse === 'string' ? serverResponse : JSON.stringify(serverResponse)), null, 2); } catch { return JSON.stringify(serverResponse, null, 2); } })()}
                  </Text>
                  <Pressable
                    onPress={() => setShowResponseAlert(false)}
                    style={{ marginTop: 10, backgroundColor: '#4b5563', borderRadius: 8, paddingVertical: 8 }}
                  >
                    <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>OK</Text>
                  </Pressable>
                </View>
              )}

              <View className="w-full gap-y-3">
                <Pressable onPress={resetToUploadView} className="p-4 rounded-xl bg-pink-500">
                  <Text className="text-white text-center font-semibold text-lg">Upload More GRN Orders</Text>
                </Pressable>
                <Pressable onPress={goToHome} className="p-4 rounded-xl bg-gray-200">
                  <Text className="text-gray-700 text-center font-semibold">Go Back to Home</Text>
                </Pressable>
              </View>
            </View>
          ) : loading ? (
            <View className="items-center">
              <Text className="text-2xl font-semibold text-pink-500 mb-4">
                Uploading {orders.length} GRN Orders...
              </Text>
              <Text className="text-gray-500 mb-4">Please do not close the app</Text>
              <LottieView source={require("@/assets/lottie/upload.json")} autoPlay loop style={{ width: 180, height: 180 }} />
              <Text className="text-sm text-gray-400 mt-4">Syncing GRN with server...</Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-center items-center gap-2 mb-6">
                <Ionicons name="cloud-upload-outline" size={32} color="#EC4899" />
                <Text className="text-2xl font-bold text-pink-500 text-center">Upload Pending GRN</Text>
              </View>

              <View className="bg-pink-50 p-4 rounded-lg mb-6">
                <Text className="text-pink-800 font-semibold text-center mb-2">Upload Summary</Text>
                <View className="gap-y-2">
                  <View className="flex flex-row justify-between">
                    <Text className="text-pink-700">Pending GRN Orders:</Text>
                    <Text className="font-semibold">{orders.length}</Text>
                  </View>
                  <View className="flex flex-row justify-between">
                    <Text className="text-pink-700">Total Items:</Text>
                    <Text className="font-semibold">{totalItems}</Text>
                  </View>
                  {stats.lastSynced && (
                    <View className="flex flex-col mt-2">
                      <Text className="text-pink-700 mb-1">Last Synced:</Text>
                      <Text className="text-pink-600 text-xs font-medium">{getFormattedLastSynced()}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                onPress={handleUpload}
                disabled={loading || orders.length === 0}
                className={`p-4 rounded-xl ${orders.length === 0 ? "bg-gray-400" : "bg-pink-500"} shadow-md`}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {orders.length === 0 ? 'No GRN Orders to Upload' : `Upload ${orders.length} GRN Orders`}
                </Text>
              </Pressable>

              {orders.length === 0 && (
                <Text className="text-gray-500 text-center mt-4">All GRN orders are synced with the server</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
