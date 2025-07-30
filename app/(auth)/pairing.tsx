import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { savePairingIP } from "@/utils/pairing";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { StatusBar } from "react-native";

export default function Pairing() {
  const [ip, setIp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ipError, setIpError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const router = useRouter();

  const handlePair = async () => {
    let hasError = false;

    if (!ip) {
      setIpError(true);
      hasError = true;
    } else {
      setIpError(false);
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
      const res = await axios.post(`http://${ip}:8000/pair-check`, {
        ip,
        password,
      });

      if (res.data.status === "success") {
        await savePairingIP(ip);
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Paired successfully 🎉",
        });
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 300);
      } else {
        Toast.show({
          type: "error",
          text1: "Pairing Failed",
          text2: res.data.message || "Invalid IP or password.",
        });
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Pairing failed. Check IP or password.",
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
        >
          <View className="flex-1 justify-center items-center px-5 py-10">
            {/* Top Section (Logo + App Name + Form) */}
            <View className="items-center w-full">
              <Image
                source={require("../../assets/images/icon.png")}
                style={{
                  width: 60,
                  height: 60,
                  marginBottom: 8,
                }}
              />
              <Text className="text-lg font-semibold mb-6">MagicPDA</Text>

              <View className="w-full max-w-[360px] bg-white rounded-2xl p-6 shadow-md">
                <Text className="text-center text-blue-500 text-xl font-semibold mb-6">
                  Pair with Server
                </Text>

                {/* Form fields */}
                <View className="gap-y-4">
                  {/* IP Field */}
                  <View>
                    <TextInput
                      value={ip}
                      onChangeText={(text) => {
                        setIp(text);
                        setIpError(false);
                      }}
                      placeholder="Enter IP (e.g. 192.168.1.10)"
                      keyboardType="decimal-pad"
                      className={`border rounded-lg px-4 py-4 text-base bg-white ${
                        ipError ? "border-red-400" : "border-yellow-300"
                      }`}
                    />
                    {ipError && (
                      <Text className="text-red-500 text-sm mt-1">
                        IP is required
                      </Text>
                    )}
                  </View>

                  {/* Password Field */}
                  <View>
                    <View className="relative">
                      <TextInput
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          setPasswordError(false);
                        }}
                        placeholder="Enter Password"
                        secureTextEntry={!showPassword}
                        className={`border rounded-lg px-4 py-4 text-base bg-white ${
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
                </View>

                {/* Button */}
                <Pressable
                  onPress={handlePair}
                  className={`rounded-lg py-3 mt-6 shadow-lg ${
                    loading ? "bg-orange-300" : "bg-orange-500"
                  }`}
                  disabled={loading}
                >
                  <Text className="text-center text-white font-bold text-lg">
                    {loading ? "Pairing..." : "Pair"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Footer */}
            <View className="mt-10">
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
