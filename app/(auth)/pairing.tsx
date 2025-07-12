import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { savePairingIP } from "@/utils/pairing";

export default function Pairing() {
  const [ip, setIp] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handlePair = async () => {
    try {
      const res = await axios.post(`http://${ip}:8000/pair-check`, {
        ip,
        password,
      });

      if (res.data.status === "success") {
        await savePairingIP(ip);
        Alert.alert("Success", "Paired successfully");
        router.replace("/(auth)/login");
      }
    } catch (err) {
      Alert.alert("Error", "Pairing failed. Check IP or password.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-100"
    >
      <View className="flex-1 justify-center items-center px-5">
        <View className="w-full max-w-[360px] bg-white rounded-2xl p-6 shadow-md">
          <Text className="text-center text-xl font-semibold mb-6">
            Pair with Server
          </Text>

          <TextInput
            value={ip}
            onChangeText={setIp}
            placeholder="Enter IP (e.g. 192.168.1.10)"
            keyboardType="numeric"
            className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base bg-white"
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter Password"
            secureTextEntry
            className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base bg-white"
          />

          <Pressable
            onPress={handlePair}
            className="bg-blue-600 rounded-lg py-3"
          >
            <Text className="text-center text-white font-medium text-base">
              Pair
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
