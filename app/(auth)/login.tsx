import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { createAPI } from "@/utils/api";
import { saveToken } from "@/utils/auth";

export default function Login() {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const api = await createAPI();
      const res = await api.post("/login", { userid, password });

      if (res.data.status === "success") {
        await saveToken(res.data.token);
        Alert.alert("Welcome", "Login successful");
        router.replace("/(tabs)");
      }
    } catch (err) {
      Alert.alert("Login Failed", "Invalid credentials or IP not paired");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-100"
    >
      <View className="flex-1 justify-center items-center px-5">
        <View className="w-full max-w-[360px] bg-white rounded-2xl p-6 shadow-lg">
          <Text className="text-center text-2xl font-bold mb-6 text-gray-800">
            🔐 Login to Your Account
          </Text>

          <View className="mb-4">
            <Text className="text-gray-600 font-medium mb-1">Username</Text>
            <TextInput
              value={userid}
              onChangeText={setUserid}
              placeholder="Enter your username"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white focus:border-blue-500"
            />
          </View>

          <View className="mb-6">
            <Text className="text-gray-600 font-medium mb-1">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white focus:border-blue-500"
            />
          </View>

          <Pressable
            onPress={handleLogin}
            className="bg-blue-600 rounded-lg py-3"
          >
            <Text className="text-center text-white font-semibold text-base">
              Login
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
