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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { savePairingIP } from "@/utils/pairing";
import { scanForServer, testConnection, connectToManualIP } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { StatusBar } from "react-native";

export default function Pairing() {
  const [ip, setIp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({
    current: 0,
    total: 0,
    currentIP: "",
  });
  const [ipError, setIpError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto");

  const router = useRouter();

  const handleAutoScan = async () => {
    setIsScanning(true);
    setScanProgress({ current: 0, total: 0, currentIP: "" });

    try {
      const foundIP = await scanForServer((current, total, currentIP) => {
        setScanProgress({ current, total, currentIP });
      });

      if (foundIP) {
        // Test the connection and pair
        const success = await testPairing(foundIP, "IMC-MOBILE");
        if (success) {
          await savePairingIP(foundIP);
          Toast.show({
            type: "success",
            text1: "Server Found! 🎉",
            text2: `Connected to ${foundIP}`,
          });
          setTimeout(() => {
            router.replace("/(auth)/login");
          }, 500);
        }
      } else {
        Toast.show({
          type: "error",
          text1: "No Server Found",
          text2: "Try manual connection or check if server is running",
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      Toast.show({
        type: "error",
        text1: "Scan Error",
        text2: "Failed to scan network. Try manual connection.",
      });
    } finally {
      setIsScanning(false);
      setScanProgress({ current: 0, total: 0, currentIP: "" });
    }
  };

  const testPairing = async (
    ipAddress: string,
    pairPassword: string
  ): Promise<boolean> => {
    try {
      const res = await axios.post(
        `http://${ipAddress}:8000/pair-check`,
        {
          ip: ipAddress,
          password: pairPassword,
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      return res.data.status === "success";
    } catch (error) {
      console.error("Pairing test failed:", error);
      return false;
    }
  };

  const handleManualPair = async () => {
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
      // First test if we can connect to the IP
      const cleanIP = ip
        .replace(/^https?:\/\//, "")
        .replace(":8000", "")
        .trim();
      const canConnect = await testConnection(cleanIP);

      if (!canConnect) {
        Toast.show({
          type: "error",
          text1: "Connection Failed",
          text2: `Cannot reach server at ${cleanIP}:8000`,
        });
        return;
      }

      // If connection works, try pairing
      const res = await axios.post(
        `http://${cleanIP}:8000/pair-check`,
        {
          ip: cleanIP,
          password,
        },
        {
          timeout: 10000,
        }
      );

      if (res.data.status === "success") {
        await savePairingIP(cleanIP);
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
          text2: res.data.message || "Invalid password.",
        });
      }
    } catch (err: any) {
      console.error("Manual pair error:", err);
      let errorMessage = "Pairing failed. Check IP and password.";

      if (err.code === "NETWORK_ERROR" || err.code === "ECONNREFUSED") {
        errorMessage =
          "Cannot connect to server. Check IP address and network.";
      } else if (err.response?.status === 401) {
        errorMessage = "Invalid password.";
      } else if (err.code === "ECONNABORTED") {
        errorMessage =
          "Connection timeout. Server might be slow or unreachable.";
      }

      Toast.show({
        type: "error",
        text1: "Error",
        text2: errorMessage,
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
                  Connect to Server
                </Text>

                {/* Tab Selector */}
                <View className="flex-row bg-gray-100 rounded-lg p-1 mb-6">
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-md ${
                      activeTab === "auto" ? "bg-orange-500" : "bg-transparent"
                    }`}
                    onPress={() => setActiveTab("auto")}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        activeTab === "auto" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      Auto Scan
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-md ${
                      activeTab === "manual"
                        ? "bg-orange-500"
                        : "bg-transparent"
                    }`}
                    onPress={() => setActiveTab("manual")}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        activeTab === "manual" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      Manual
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Auto Scan Tab */}
                {activeTab === "auto" && (
                  <View>
                    <View className="items-center mb-6">
                      <Ionicons name="wifi" size={40} color="#FB923C" />
                      <Text className="text-gray-600 text-center mt-2">
                        Automatically find your server on the network
                      </Text>
                    </View>

                    {isScanning && (
                      <View className="mb-4 p-4 bg-blue-50 rounded-lg">
                        <Text className="text-center text-blue-700 font-semibold mb-2">
                          Scanning Network...
                        </Text>
                        <Text className="text-center text-blue-600 text-sm mb-2">
                          {scanProgress.current}/{scanProgress.total}
                        </Text>
                        <Text className="text-center text-blue-500 text-xs">
                          Testing: {scanProgress.currentIP}
                        </Text>
                        <View className="mt-2 bg-blue-200 h-2 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%`,
                            }}
                          />
                        </View>
                      </View>
                    )}

                    <Pressable
                      onPress={handleAutoScan}
                      className={`rounded-lg py-4 shadow-lg ${
                        isScanning ? "bg-orange-300" : "bg-orange-500"
                      }`}
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <View className="flex-row justify-center items-center">
                          <ActivityIndicator color="white" size="small" />
                          <Text className="text-white font-bold text-lg ml-2">
                            Scanning...
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-center text-white font-bold text-lg">
                          🔍 Find Server
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {/* Manual Tab */}
                {activeTab === "manual" && (
                  <View>
                    <View className="items-center mb-6">
                      <Ionicons
                        name="create-outline"
                        size={40}
                        color="#FB923C"
                      />
                      <Text className="text-gray-600 text-center mt-2">
                        Enter server details manually
                      </Text>
                    </View>

                    {/* Form fields */}
                    <View className="gap-y-4">
                      {/* IP Field */}
                      <View>
                        <Text className="text-gray-700 font-semibold mb-2">
                          Server IP Address
                        </Text>
                        <TextInput
                          value={ip}
                          onChangeText={(text) => {
                            setIp(text);
                            setIpError(false);
                          }}
                          placeholder="e.g. 192.168.1.100"
                          keyboardType="decimal-pad"
                          className={`border rounded-lg px-4 py-4 text-base bg-white ${
                            ipError ? "border-red-400" : "border-yellow-300"
                          }`}
                        />
                        {ipError && (
                          <Text className="text-red-500 text-sm mt-1">
                            IP address is required
                          </Text>
                        )}
                      </View>

                      {/* Password Field */}
                      <View>
                        <Text className="text-gray-700 font-semibold mb-2">
                          Pairing Password
                        </Text>
                        <View className="relative">
                          <TextInput
                            value={password}
                            onChangeText={(text) => {
                              setPassword(text);
                              setPasswordError(false);
                            }}
                            placeholder="Enter pairing password"
                            secureTextEntry={!showPassword}
                            className={`border rounded-lg px-4 py-4 text-base bg-white ${
                              passwordError
                                ? "border-red-400"
                                : "border-yellow-300"
                            }`}
                          />
                          <TouchableOpacity
                            className="absolute right-4 top-4"
                            onPress={() => setShowPassword((prev) => !prev)}
                          >
                            <Ionicons
                              name={showPassword ? "eye-off" : "eye"}
                              size={22}
                              color="#666"
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
                      onPress={handleManualPair}
                      className={`rounded-lg py-4 mt-6 shadow-lg ${
                        loading ? "bg-orange-300" : "bg-orange-500"
                      }`}
                      disabled={loading}
                    >
                      {loading ? (
                        <View className="flex-row justify-center items-center">
                          <ActivityIndicator color="white" size="small" />
                          <Text className="text-white font-bold text-lg ml-2">
                            Connecting...
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-center text-white font-bold text-lg">
                          🔗 Connect
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {/* Help Section */}
                <View className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <Text className="text-gray-700 font-semibold mb-2">
                    💡 Need Help?
                  </Text>
                  <Text className="text-gray-600 text-sm leading-5">
                    • Ensure both devices are on the same WiFi network{"\n"}•
                    Check that the server is running on your computer{"\n"}•
                    Look for the IP address in the server console{"\n"}• Default
                    password is usually: IMC-MOBILE
                  </Text>
                </View>
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
