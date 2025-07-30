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
  Image,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { createAPI } from "@/utils/api";
import { saveToken, saveUserid } from "@/utils/auth";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { StatusBar } from "react-native";

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
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Welcome, Login successful",
        });
        setTimeout(() => {
          router.replace("/(main)");
        }, 300);
      } else {
        Toast.show({
          type: "error",
          text1: "Login failed",
          text2: res.data.message || "Invalid credentials",
        });
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Login failed. Check UserID or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* Coloured Status Bar */}
      <StatusBar backgroundColor="#FB923C" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="bg-gray-100"
        >
          <View className="flex-1 justify-center items-center px-5 pt-20">
            {/* Logo & Title */}
            <View className="items-center mb-6">
              <Image
                source={require("../../assets/images/icon.png")}
                style={{ width: 60, height: 60, marginBottom: 8 }}
              />
              <Text className="text-lg font-semibold">MagicPDA</Text>
            </View>

            {/* Login Box */}
            <View className="w-full max-w-[360px] bg-white rounded-2xl p-6 shadow-lg">
              <Text className="text-center text-2xl font-bold mb-6 text-blue-500">
                Login to Your Account
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
                  className={`border rounded-xl px-4 py-4 text-base bg-white shadow-sm ${
                    useridError ? "border-red-400" : "border-yellow-300"
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
                    className={`border rounded-xl px-4 py-4 text-base bg-white shadow-sm ${
                      passwordError ? "border-red-400" : "border-yellow-300"
                    }`}
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-4"
                    onPress={() => setShowPassword((prev) => !prev)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#000"
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
                className={`rounded-xl py-4 shadow-lg ${
                  loading ? "bg-orange-300" : "bg-orange-500"
                }`}
                disabled={loading}
              >
                <Text className="text-center text-white font-bold text-lg">
                  {loading ? "Logging in..." : "Login"}
                </Text>
              </Pressable>
            </View>

            {/* Footer */}
            <View className="mt-10 mb-6">
              <Text className="text-sm text-gray-400 text-center">
                Powered by IMC Business Solutions
              </Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
