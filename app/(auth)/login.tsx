import { createDebugAPI, createEnhancedAPI } from "@/utils/api";
import { saveToken, saveUserid } from "@/utils/auth";
import { debugLoginPayloads } from "@/utils/debug";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
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

  const handleLogoPress = () => {
    setDebugMode(prev => !prev);
    Toast.show({
      type: 'info',
      text1: debugMode ? 'Debug mode disabled' : 'Debug mode enabled',
      text2: debugMode ? 'Normal login' : 'Testing all payload formats',
    });
  };

  const getDeviceId = async () => {
    try {
      let id;
      if (Platform.OS === "android") {
        id = Application.androidId;
        if (!id) {
          id = await AsyncStorage.getItem("deviceId");
          if (!id) {
            id = `android_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await AsyncStorage.setItem("deviceId", id);
          }
        }
      } else if (Platform.OS === "ios") {
        id = await Application.getIosIdForVendorAsync();
        if (!id) {
          id = await AsyncStorage.getItem("deviceId");
          if (!id) {
            id = `ios_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await AsyncStorage.setItem("deviceId", id);
          }
        }
      } else {
        id = await AsyncStorage.getItem("deviceId");
        if (!id) {
          id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem("deviceId", id);
        }
      }
      return id;
    } catch (error) {
      console.error("Error getting device ID:", error);
      return null;
    }
  };

  const validateLicenseWithAPI = async () => {
    try {
      console.log("=== LICENSE VALIDATION START ===");
      
      const storedLicenseKey = await AsyncStorage.getItem("licenseKey");
      const storedClientId = await AsyncStorage.getItem("clientId");
      
      console.log("Stored License Key:", storedLicenseKey);
      console.log("Stored Client ID:", storedClientId);
      
      if (!storedLicenseKey) {
        console.log("NO LICENSE KEY FOUND");
        return { 
          valid: false, 
          message: "No license found. Please activate your license first.",
          needsActivation: true
        };
      }

      if (!storedClientId) {
        console.log("NO CLIENT ID FOUND");
        return { 
          valid: false, 
          message: "Client ID missing. Please reactivate your license.",
          needsActivation: true
        };
      }

      const currentDeviceId = await getDeviceId();
      console.log("Current Device ID:", currentDeviceId);
      
      if (!currentDeviceId) {
        return { valid: false, message: "Device ID not available" };
      }

      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/`;
      
      console.log("Calling API:", CHECK_LICENSE_API);
      const response = await fetch(CHECK_LICENSE_API, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.log("API FAILED");
        return { 
          valid: false, 
          message: "Failed to validate license. Please try again."
        };
      }

      if (!data.customers || data.customers.length === 0) {
        console.log("NO CUSTOMERS");
        return { 
          valid: false, 
          message: "No valid license found. Please contact support."
        };
      }

      const customer = data.customers.find(
        (c: any) => c.license_key === storedLicenseKey
      );

      if (!customer) {
        console.log("LICENSE KEY NOT FOUND IN API");
        return { 
          valid: false, 
          message: "Invalid license key. Please reactivate your license.",
          needsActivation: true
        };
      }

      console.log("Customer Found:", customer.customer_name);

      const licenseStatus = String(customer.status || "").toLowerCase().trim();
      console.log("License Status:", licenseStatus);

      if (licenseStatus !== "active") {
        console.log("LICENSE NOT ACTIVE");
        return { 
          valid: false, 
          message: `License is ${customer.status}. Please contact support.`
        };
      }

      const isDeviceRegistered = customer.registered_devices?.some(
        (device: any) => device.device_id === currentDeviceId
      );
      
      console.log("Device Registered:", isDeviceRegistered);
      
      if (!isDeviceRegistered) {
        console.log("DEVICE NOT REGISTERED");
        return { 
          valid: false, 
          message: "This device is not registered. Please activate your license again.",
          needsActivation: true
        };
      }

      console.log("=== LICENSE VALID ===");
      console.log("Returning clientId:", customer.client_id);
      
      return {
        valid: true,
        customerName: customer.customer_name,
        clientId: customer.client_id,
        licenseKey: customer.license_key
      };

    } catch (error) {
      console.error("VALIDATION ERROR:", error);
      return { 
        valid: false, 
        message: "Network error. Please check your connection and try again."
      };
    }
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

    try {
      console.log("=== LOGIN PROCESS START ===");
      
      const licenseValidation = await validateLicenseWithAPI();
      
      console.log("License Validation Result:", JSON.stringify(licenseValidation, null, 2));
      
      if (!licenseValidation || !licenseValidation.valid) {
        setLoading(false);
        console.log("LICENSE VALIDATION FAILED");
        
        if (licenseValidation?.needsActivation) {
          Toast.show({
            type: "error",
            text1: "License Not Valid",
            text2: licenseValidation.message,
            visibilityTime: 4000,
          });
          
          setTimeout(() => {
            router.replace("/(auth)/license");
          }, 1500);
        } else {
          Toast.show({
            type: "error",
            text1: "License Validation Failed",
            text2: licenseValidation?.message || "Unknown error",
            visibilityTime: 4000,
          });
        }
        return;
      }

      console.log("LICENSE VALIDATED SUCCESSFULLY");
      console.log("Using Client ID:", licenseValidation.clientId);
      
      // Store the clientId for the API calls
      await AsyncStorage.setItem("clientId", licenseValidation.clientId);
      
      if (debugMode) {
        await runDebugLogin(licenseValidation.clientId);
      } else {
        await runNormalLogin(licenseValidation.clientId);
      }
      
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
    }
  };

  const runNormalLogin = async (clientId: string) => {
    try {
      console.log("=== NORMAL LOGIN START ===");
      console.log("Client ID:", clientId);
      console.log("Username:", username);
      
      const api = await createEnhancedAPI();
      
      const commonPayloads = [
        { userid: username, password, client_id: clientId },
        { username, password, client_id: clientId },
        { email: username, password, client_id: clientId },
        { login: username, password, client_id: clientId },
      ];

      let success = false;
      
      for (const [index, payload] of commonPayloads.entries()) {
        try {
          console.log(`Attempt ${index + 1}:`, JSON.stringify(payload));
          const res = await api.post("/login", payload);
          
          console.log("Response:", res.data);

          if (res.data.status === "success") {
            await handleLoginSuccess(res.data);
            success = true;
            break;
          }
        } catch (err: any) {
          console.log(`Failed ${index + 1}:`, err.response?.status, err.response?.data);
          continue;
        }
      }
      
      if (!success) {
        Toast.show({
          type: "error",
          text1: "Login failed",
          text2: "Invalid username or password",
        });
        setLoading(false);
      }
      
    } catch (err: any) {
      console.error("LOGIN API ERROR:", err);
      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: "Cannot connect to server. Please try again.",
      });
      setLoading(false);
    }
  };

  const runDebugLogin = async (clientId: string) => {
    try {
      const api = await createDebugAPI();
      const basePayloads = debugLoginPayloads(username, password);
      
      // Add client_id to all payloads
      const payloads = basePayloads.map(p => ({ ...p, client_id: clientId }));
      
      console.log("DEBUG MODE: Testing all formats with clientId:", clientId);
      
      for (const [index, payload] of payloads.entries()) {
        try {
          console.log(`\n=== Payload ${index + 1} ===`);
          console.log(JSON.stringify(payload, null, 2));
          
          const res = await api.post("/login", payload);
          console.log("SUCCESS:", res.data);
          
          if (res.data.status === "success") {
            await handleLoginSuccess(res.data);
            break;
          }
        } catch (err: any) {
          console.log("FAILED:", err.response?.status, err.response?.data);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (err: any) {
      console.error("DEBUG ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (data: any) => {
    console.log("=== LOGIN SUCCESS ===");
    await saveToken(data.token);
    await saveUserid(data.user_id);
    
    Toast.show({
      type: "success",
      text1: "Success",
      text2: "Login successful!",
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
                  {loading ? "Validating & Logging in..." : "Login"}
                </Text>
              </Pressable>

              {debugMode && (
                <Text className="text-xs text-gray-500 text-center mt-4">
                  Debug: Testing all formats + client_id
                </Text>
              )}
            </View>

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