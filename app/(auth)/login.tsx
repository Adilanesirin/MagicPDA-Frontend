import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { createAPI } from "@/utils/api";
import { saveToken, saveUserid } from "@/utils/auth";
import { Ionicons } from "@expo/vector-icons";

export default function Login() {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useridError, setUseridError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    let hasError = false;

    if (!userid) {
      setUseridError(true);
      hasError = true;
    } else {
      setUseridError(false);
    }

    if (!password) {
      setPasswordError(true);
      hasError = true;
    } else {
      setPasswordError(false);
    }

    if (hasError) return;

    setLoading(true);
    try {
      const api = await createAPI();
      const res = await api.post("/login", { userid, password });

      if (res.data.status === "success") {
        await saveToken(res.data.token);
        await saveUserid(res.data.user_id);
        Alert.alert("Welcome", "Login successful");
        router.replace("/(main)");
      } else {
        Alert.alert("Login Failed", "Invalid credentials");
      }
    } catch (err) {
      Alert.alert("Login Failed", "Invalid credentials or IP not paired");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center items-center px-5 bg-gray-100">
            <View className="w-full max-w-[360px] bg-white rounded-2xl p-6 shadow-lg">
              <Text className="text-center text-2xl font-bold mb-6 text-gray-800">
                🔐 Login to Your Account
              </Text>

              <View className="mb-4">
                <Text className="text-gray-600 font-medium mb-1">Username</Text>
                <TextInput
                  value={userid}
                  onChangeText={(text) => {
                    setUserid(text);
                    setUseridError(false);
                  }}
                  placeholder="Enter your username"
                  className={`border rounded-lg px-4 py-3 text-base bg-white ${
                    useridError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {useridError && (
                  <Text className="text-red-500 text-sm mt-1">
                    Username is required
                  </Text>
                )}
              </View>

              <View className="mb-6">
                <Text className="text-gray-600 font-medium mb-1">Password</Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError(false);
                    }}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    className={`border rounded-lg px-4 py-3 text-base bg-white ${
                      passwordError ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <TouchableOpacity
                    className="absolute right-3 top-3"
                    onPress={() => setShowPassword((prev) => !prev)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#555"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError && (
                  <Text className="text-red-500 text-sm mt-1">
                    Password is required
                  </Text>
                )}
              </View>

              <Pressable
                onPress={handleLogin}
                className={`rounded-lg py-3 ${
                  loading ? "bg-blue-400" : "bg-blue-600"
                }`}
                disabled={loading}
              >
                <Text className="text-center text-white font-semibold text-base">
                  {loading ? "Logging in..." : "Login"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
