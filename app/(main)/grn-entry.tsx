import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getAllSuppliers } from "../../utils/database";

type Supplier = { code: string; name: string };

const db = SQLite.openDatabaseSync("magicpedia.db");

export default function GRNEntry() {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  // State to track which suppliers have pending items
  const [suppliersWithPendingItems, setSuppliersWithPendingItems] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Function to check which suppliers have pending GRN items
  const checkPendingGRNItems = async () => {
    try {
      console.log("🔍 Checking for suppliers with pending GRN items...");
      
      const pendingItems: any[] = await db.getAllAsync(
        `SELECT DISTINCT supplier_code FROM pending_grn_items WHERE supplier_code IS NOT NULL AND supplier_code != ''`
      );
      
      const supplierCodes = new Set<string>();
      pendingItems.forEach(item => {
        if (item.supplier_code) {
          supplierCodes.add(item.supplier_code);
        }
      });
      
      console.log(`✅ Found ${supplierCodes.size} suppliers with pending GRN items:`, Array.from(supplierCodes));
      setSuppliersWithPendingItems(supplierCodes);
    } catch (error) {
      console.error("❌ Error checking pending GRN items:", error);
    }
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const supplierData = await getAllSuppliers();
        setSuppliers(supplierData || []);
        
        console.log(`✅ Loaded ${supplierData?.length || 0} suppliers for GRN`);
        
        // Check for pending items after loading suppliers
        await checkPendingGRNItems();
      } catch (err) {
        console.error("❌ Error fetching suppliers:", err);
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuppliers();
  }, []);

  // Refresh pending items check when modal opens
  useEffect(() => {
    if (modalVisible) {
      checkPendingGRNItems();
    }
  }, [modalVisible]);

  const filteredSuppliers = suppliers.filter((s) =>
    s?.name?.toLowerCase()?.includes(searchText.toLowerCase()) || false
  );

  const handleProceed = () => {
    if (selectedSupplier) {
      router.push({
        pathname: "/grn-barcode-entry",
        params: {
          supplier: selectedSupplier.name,
          supplier_code: selectedSupplier.code,
        },
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSupplierSelect = (item) => {
    setSelectedSupplier(item);
    setModalVisible(false);
    setSearchText("");
  };

  // Function to check if a supplier has pending items
  const hasPendingItems = (supplierCode: string) => {
    return suppliersWithPendingItems.has(supplierCode);
  };

  const renderSupplierItem = ({ item }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200 flex-row items-center justify-between"
      onPress={() => handleSupplierSelect(item)}
    >
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-base text-gray-700">{item?.name || "Unknown"}</Text>
          {hasPendingItems(item?.code) && (
            <View className="ml-3 bg-red-500 rounded-full w-3 h-3" />
          )}
        </View>
        <Text className="text-sm text-gray-500">Code: {item?.code || "N/A"}</Text>
      </View>
      
      {hasPendingItems(item?.code) && (
        <View className="flex-row items-center bg-red-50 px-3 py-1 rounded-full">
          <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
          <Text className="text-xs text-red-600 font-medium">Pending Items</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View className="p-4">
      <Text className="text-gray-500 text-center">
        {searchText ? "No suppliers match your search" : "No suppliers available"}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-100">
      <View className="absolute top-12 left-4 z-50">
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 50, paddingTop: 60 }}
        className="px-5"
      >
        <View className="items-center mb-6">
          <Text className="text-2xl font-bold text-pink-500">
            Select Supplier for GRN
          </Text>
          
          {/* Legend/Info about red dots */}
         
        </View>

        <View className="bg-white p-6 rounded-2xl shadow-lg max-w-[360px] self-center w-full">
          <Text className="text-base font-semibold mb-2 text-gray-700">
            Supplier
          </Text>
          
          {loading ? (
            <View className="border border-pink-300 p-4 rounded-xl mb-6 bg-gray-50">
              <Text className="text-base text-gray-400">Loading suppliers...</Text>
            </View>
          ) : suppliers.length === 0 ? (
            <View className="border border-red-300 p-4 rounded-xl mb-6 bg-red-50">
              <Text className="text-base text-red-600">No suppliers found. Please sync data first.</Text>
            </View>
          ) : (
            <TouchableOpacity
              className="border border-pink-300 p-4 rounded-xl mb-6 bg-white shadow-sm"
              onPress={() => setModalVisible(true)}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text className="text-base text-gray-600">
                    {selectedSupplier?.name || "Choose a supplier..."}
                  </Text>
                  {selectedSupplier && hasPendingItems(selectedSupplier.code) && (
                    <View className="ml-3 bg-red-500 rounded-full w-3 h-3" />
                  )}
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </View>
              
              {selectedSupplier && hasPendingItems(selectedSupplier.code) && (
                <View className="mt-2 flex-row items-center bg-red-50 px-2 py-1 rounded self-start">
                  <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  <Text className="text-xs text-red-600 font-medium">Has pending items</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            disabled={!selectedSupplier || loading}
            onPress={handleProceed}
            className={`p-4 rounded-xl shadow-lg ${
              selectedSupplier && !loading ? "bg-pink-500" : "bg-gray-300"
            }`}
          >
            <Text className="text-white text-center font-bold text-base">
              {loading ? "Loading..." : "Proceed to GRN Entry"}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal visible={modalVisible} animationType="slide">
          <View className="flex-1 bg-white px-4 pt-10">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-pink-500">
                Search Supplier
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Type to search supplier name..."
              className="border border-pink-300 p-4 rounded-xl mb-4 shadow-sm bg-white"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus={true}
            />

            {/* Legend inside modal */}
            <View className="mb-4 bg-gray-50 p-3 rounded-lg">
              <View className="flex-row items-center">
                <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                <Text className="text-sm text-gray-700">Has pending GRN items</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                {suppliersWithPendingItems.size} supplier(s) have items pending upload
              </Text>
            </View>

            <FlatList
              data={filteredSuppliers}
              keyExtractor={(item, index) => `supplier-${item?.code || index}`}
              renderItem={renderSupplierItem}
              ListEmptyComponent={renderEmptyList}
            />

            <TouchableOpacity
              className="mb-3 mt-4 bg-pink-400 p-4 rounded-xl"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-white text-center font-semibold text-base">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}