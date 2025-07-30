import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import * as SQLite from "expo-sqlite";
import { useRouter } from "expo-router";

export default function Entry() {
  type Supplier = { code: string; name: string };
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  const db = SQLite.openDatabaseSync("magicpedia.db");

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const rows = await db.getAllAsync(
          "SELECT DISTINCT code, name FROM master_data"
        );
        // const names = rows.map((item: any) => item.name);
        setSuppliers(rows as Supplier[]);
      } catch (err) {
        console.error("❌ Error fetching suppliers:", err);
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

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 50 }}
      className="p-4 bg-white"
    >
      <Text className="text-2xl font-bold mt-24 mb-5">Select Supplier</Text>

      <TouchableOpacity
        className="border p-4 rounded-lg bg-white mb-4"
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-base">
          {selectedSupplier?.name || "Choose a supplier..."}
        </Text>
      </TouchableOpacity>

      {/* Modal Dropdown */}
      <Modal visible={modalVisible} animationType="slide">
        <View className="flex-1 p-4 bg-white">
          <Text className="text-xl font-bold mb-3">Search Supplier</Text>
          <TextInput
            placeholder="Type to search..."
            className="border p-3 rounded-lg mb-4"
            value={searchText}
            onChangeText={setSearchText}
          />
          <FlatList
            data={filteredSuppliers}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="p-3 border-b"
                onPress={() => {
                  setSelectedSupplier(item);
                  setModalVisible(false);
                  setSearchText("");
                }}
              >
                <Text>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            className="mt-4 bg-red-500 p-3 rounded-lg"
            onPress={() => setModalVisible(false)}
          >
            <Text className="text-white text-center font-semibold">Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <TouchableOpacity
        disabled={!selectedSupplier}
        onPress={handleProceed}
        className={`p-4 rounded-lg ${
          selectedSupplier ? "bg-blue-500" : "bg-gray-300"
        }`}
      >
        <Text className="text-white text-center font-semibold">
          Proceed to Entry
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
