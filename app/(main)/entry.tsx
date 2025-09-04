import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { getAllSuppliers } from "../../utils/database"; // Import from root utils folder

export default function Entry() {
  type Supplier = { code: string; name: string };
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        // Use the helper function (recommended)
        const supplierData = await getAllSuppliers();
        setSuppliers(supplierData as Supplier[]);
        
        console.log(`✅ Loaded ${supplierData.length} suppliers`);
      } catch (err) {
        console.error("❌ Error fetching suppliers:", err);
        // Show user-friendly error message
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleProceed = () => {
    if (selectedSupplier) {
      router.push({
        pathname: "/barcode-entry",
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

  return (
    <View className="flex-1 bg-gray-100">
      {/* Back Button */}
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
          <Text className="text-2xl font-bold text-blue-500">
            Select Supplier
          </Text>
        </View>

        <View className="bg-white p-6 rounded-2xl shadow-lg max-w-[360px] self-center w-full">
          <Text className="text-base font-semibold mb-2 text-gray-700">
            Supplier
          </Text>
          
          {loading ? (
            <View className="border border-yellow-300 p-4 rounded-xl mb-6 bg-gray-50">
              <Text className="text-base text-gray-400">Loading suppliers...</Text>
            </View>
          ) : suppliers.length === 0 ? (
            <View className="border border-red-300 p-4 rounded-xl mb-6 bg-red-50">
              <Text className="text-base text-red-600">No suppliers found. Please sync data first.</Text>
            </View>
          ) : (
            <TouchableOpacity
              className="border border-yellow-300 p-4 rounded-xl mb-6 bg-white shadow-sm"
              onPress={() => setModalVisible(true)}
            >
              <Text className="text-base text-gray-600">
                {selectedSupplier?.name || "Choose a supplier..."}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            disabled={!selectedSupplier || loading}
            onPress={handleProceed}
            className={`p-4 rounded-xl shadow-lg ${
              selectedSupplier && !loading ? "bg-orange-500" : "bg-gray-300"
            }`}
          >
            <Text className="text-white text-center font-bold text-base">
              {loading ? "Loading..." : "Proceed to Entry"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal Dropdown */}
        <Modal visible={modalVisible} animationType="slide">
          <View className="flex-1 bg-white px-4 pt-10">
            <Text className="text-xl font-bold mb-4 text-blue-500">
              Search Supplier
            </Text>

            <TextInput
              placeholder="Type to search..."
              className="border border-yellow-300 p-4 rounded-xl mb-4 shadow-sm bg-white"
              value={searchText}
              onChangeText={setSearchText}
            />

            <FlatList
              data={filteredSuppliers}
              keyExtractor={(item, index) => `${item.code}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="p-4 border-b border-gray-200"
                  onPress={() => {
                    setSelectedSupplier(item);
                    setModalVisible(false);
                    setSearchText("");
                  }}
                >
                  <Text className="text-base text-gray-700">{item.name}</Text>
                  <Text className="text-sm text-gray-500">Code: {item.code}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="p-4">
                  <Text className="text-gray-500 text-center">
                    {searchText ? "No suppliers match your search" : "No suppliers available"}
                  </Text>
                </View>
              }
            />

            <TouchableOpacity
              className="mb-3 bg-orange-400 p-4 rounded-xl"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-white text-center font-semibold text-base">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Footer */}
        {/* <View className="mt-10 mb-6">
          <Text className="text-sm text-gray-400 text-center">
            Powered by IMC Business Solutions
          </Text>
        </View> */}
      </ScrollView>
    </View>
  );
}