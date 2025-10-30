import { createDebugAPI, createEnhancedAPI } from "@/utils/api";
import { saveToken, saveUserid } from "@/utils/auth";
import { analyzeServerError, debugLoginPayloads } from "@/utils/debug";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const router = useRouter();

  // Double-tap logo to enable debug mode
  const handleLogoPress = () => {
    setDebugMode(prev => !prev);
    Toast.show({
      type: 'info',
      text1: debugMode ? 'Debug mode disabled' : 'Debug mode enabled',
      text2: debugMode ? 'Normal login' : 'Testing all payload formats',
    });
  };

  const handleLogin = async () => {
    let hasError = false;

    if (!username) {
      setUsernameError(true);
      hasError = true;
    } else {
      setUsernameError(false);
    }

    if (!password) {
      setPasswordError(true);
      hasError = true;
    } else {
      setPasswordError(false);
    }

    if (hasError) return;

    setLoading(true);

    if (debugMode) {
      await runDebugLogin();
    } else {
      await runNormalLogin();
    }
  };

  const runNormalLogin = async () => {
    try {
      console.log("🔄 Creating API instance for login...");
      const api = await createEnhancedAPI();
      
      // Try the most common patterns first
      const commonPayloads = [
        { userid: username, password }, // Most likely
        { username, password }, // Original
        { email: username, password }, // Email based
        { login: username, password }, // Generic login
      ];

      let success = false;
      
      for (const [index, payload] of commonPayloads.entries()) {
        try {
          console.log(`🧪 Attempt ${index + 1}:`, JSON.stringify(payload));
          const res = await api.post("/login", payload);
          
          console.log("✅ Success with payload:", JSON.stringify(payload));
          console.log("📥 Response:", res.data);

          if (res.data.status === "success") {
            await handleLoginSuccess(res.data);
            success = true;
            break;
          }
        } catch (err: any) {
          console.log(`❌ Failed with payload ${index + 1}:`, {
            status: err.response?.status,
            data: err.response?.data
          });
          continue;
        }
      }
      
      if (!success) {
        Toast.show({
          type: "error",
          text1: "Login failed",
          text2: "Please check username/password format OR check Database connection",
          
        });
      }
      
    } catch (err: any) {
      console.error("💥 Login error:", err);
      analyzeServerError(err);
      
      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: "Cannot connect to server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const runDebugLogin = async () => {
    try {
      const api = await createDebugAPI();
      const payloads = debugLoginPayloads(username, password);
      
      console.log("🔍 DEBUG MODE: Testing all payload formats");
      
      const results = [];
      
      for (const [index, payload] of payloads.entries()) {
        try {
          console.log(`\n--- Testing Payload ${index + 1} ---`);
          console.log("Payload:", JSON.stringify(payload, null, 2));
          
          const res = await api.post("/login", payload);
          results.push({
            payloadIndex: index + 1,
            payload,
            success: true,
            response: res.data,
            status: res.status
          });
          
          console.log("✅ SUCCESS:", res.status, res.data);
          
          if (res.data.status === "success") {
            await handleLoginSuccess(res.data);
            break;
          }
          
        } catch (err: any) {
          results.push({
            payloadIndex: index + 1,
            payload,
            success: false,
            error: err.response?.data,
            status: err.response?.status
          });
          
          console.log("❌ FAILED:", err.response?.status, err.response?.data);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Log all results
      console.log("\n📊 DEBUG RESULTS SUMMARY:");
      results.forEach(result => {
        console.log(`Payload ${result.payloadIndex}: ${result.success ? '✅' : '❌'} ${result.status}`);
        if (!result.success) {
          console.log('  Error:', JSON.stringify(result.error, null, 2));
        }
      });
      
      if (!results.some(r => r.success && r.response?.status === "success")) {
        Toast.show({
          type: "error",
          text1: "Debug Complete",
          text2: "Check console for results. No successful login format found.",
        });
      }
      
    } catch (err: any) {
      console.error("💥 Debug mode error:", err);
      analyzeServerError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (data: any) => {
    await saveToken(data.token);
    await saveUserid(data.user_id);
    
    Toast.show({
      type: "success",
      text1: "Success",
      text2: "Welcome, Login successful",
    });
    
    setTimeout(() => {
      router.replace("/(main)");
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <StatusBar backgroundColor="#FB923C" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="bg-gray-100"
        >
          <View className="flex-1 justify-center items-center px-5 pt-20">
            {/* Logo & Title - Make logo pressable for debug mode */}
            <View className="items-center mb-6">
              <TouchableOpacity onPress={handleLogoPress}>
                <Image
                  source={require("../../assets/images/icon.jpg")}
                  style={{ width: 60, height: 60, marginBottom: 8 }}
                />
              </TouchableOpacity>
              <Text className="text-lg font-semibold">TaskPMS</Text>
              {debugMode && (
                <Text className="text-orange-500 text-sm mt-1">DEBUG MODE</Text>
              )}
            </View>

            {/* Login Box */}
            <View className="w-full max-w-[360px] bg-white rounded-2xl p-6 shadow-lg">
              <Text className="text-center text-2xl font-bold mb-6 text-blue-500">
                Login to Your Account
              </Text>

              <View className="mb-4">
                <Text className="text-gray-600 font-medium mb-1">
                  {debugMode ? "Username/UserID/Email" : "Username"}
                </Text>
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setUsernameError(false);
                  }}
                  placeholder={debugMode ? "Enter username, userid, or email" : "Enter your username"}
                  className={`border rounded-xl px-4 py-4 text-base bg-white shadow-sm ${
                    usernameError ? "border-red-400" : "border-yellow-300"
                  }`}
                />
                {usernameError && (
                  <Text className="text-red-500 text-sm mt-1">
                    This field is required
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

              {debugMode && (
                <Text className="text-xs text-gray-500 text-center mt-4">
                  Debug mode: Testing all field name combinations
                </Text>
              )}
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