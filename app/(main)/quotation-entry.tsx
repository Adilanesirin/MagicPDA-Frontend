import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function QuotationEntry() {
  const [customerName, setCustomerName] = useState("");
  const [customerPlace, setCustomerPlace] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const router = useRouter();

  const handleProceed = () => {
    const name = customerName.replace(/\|/g, "").trim();
    const place = customerPlace.replace(/\|/g, "").trim();
    const number = customerNumber.replace(/\|/g, "").trim();
    if (!name) return;

    router.push({
      pathname: "/quotation-barcode-entry",
      params: {
        supplier: name,
        supplier_code: `${name}||${place}||${number}`,
      },
    });
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
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-6">
          <Text className="text-2xl font-bold text-teal-600">
            Add Customer
          </Text>
        </View>

        <View className="bg-white p-6 rounded-2xl shadow-lg max-w-[360px] self-center w-full">
          <Text className="text-base font-semibold mb-2 text-gray-700">
            Customer Name
          </Text>
          <TextInput
            placeholder="Enter customer name"
            className="border border-teal-200 p-4 rounded-xl mb-4 bg-white"
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text className="text-base font-semibold mb-2 text-gray-700">
            Place
          </Text>
          <TextInput
            placeholder="Enter place"
            className="border border-teal-200 p-4 rounded-xl mb-6 bg-white"
            value={customerPlace}
            onChangeText={setCustomerPlace}
          />

          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#374151" }}>
            Customer Number
          </Text>
          <TextInput
            placeholder="Enter customer number"
            keyboardType="phone-pad"
            className="border border-teal-200 p-4 rounded-xl mb-6 bg-white"
            value={customerNumber}
            onChangeText={setCustomerNumber}
          />

          <TouchableOpacity
            disabled={!customerName.trim()}
            onPress={handleProceed}
            className={`p-4 rounded-xl shadow-lg ${
              customerName.trim() ? "bg-teal-600" : "bg-gray-300"
            }`}
          >
            <Text className="text-white text-center font-bold text-base">
              Proceed to Entry
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
