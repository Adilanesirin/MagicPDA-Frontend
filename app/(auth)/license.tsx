import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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

export default function License() {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [licenseError, setLicenseError] = useState(false);

  const router = useRouter();

  const getDeviceId = async () => {
    try {
      let id;
      if (Platform.OS === "android") {
        id = Application.androidId || `android_${Date.now()}`;
      } else if (Platform.OS === "ios") {
        id = (await Application.getIosIdForVendorAsync()) || `ios_${Date.now()}`;
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
      return `device_${Date.now()}`;
    }
  };

  const getDeviceName = async () => {
    try {
      let name = "";
      
      if (Platform.OS === "android") {
        const brand = Device.brand || "";
        const modelName = Device.modelName || "";
        name = `${brand} ${modelName}`.trim() || "Android Device";
      } else if (Platform.OS === "ios") {
        const modelName = Device.modelName || "";
        name = modelName || "iOS Device";
      } else {
        name = "Unknown Device";
      }
      
      return name;
    } catch (error) {
      console.error("Error getting device name:", error);
      return "Unknown Device";
    }
  };

  const checkDeviceRegistration = async (deviceIdToCheck: string) => {
    try {
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/`;

      const response = await fetch(CHECK_LICENSE_API, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (!response.ok || !data.success) {
        console.log("API check failed");
        return { found: false };
      }

      if (!data.customers || data.customers.length === 0) {
        console.log("No customers found");
        return { found: false };
      }

      // Check if this device is registered under any customer
      for (const customer of data.customers) {
        if (customer.registered_devices && customer.registered_devices.length > 0) {
          const deviceFound = customer.registered_devices.some(
            (device: any) => device.device_id === deviceIdToCheck
          );

          if (deviceFound) {
            console.log("Device found in customer:", customer.customer_name);
            console.log("Customer status:", customer.status);
            
            return {
              found: true,
              customer: customer,
              projectName: data.project_name
            };
          }
        }
      }

      console.log("Device not found in any customer");
      return { found: false };
    } catch (error) {
      console.error("Error checking device registration:", error);
      return { found: false };
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setChecking(true);

        const id = await getDeviceId();
        setDeviceId(id);

        const name = await getDeviceName();
        setDeviceName(name);

        console.log("Checking if device is already registered...");
        console.log("Device ID:", id);
        console.log("Device Name:", name);

        // IMPORTANT: Check local license status FIRST
        const licenseActivated = await AsyncStorage.getItem("licenseActivated");
        const storedDeviceId = await AsyncStorage.getItem("deviceId");
        
        console.log("📱 Local License Status:");
        console.log("  - License Activated:", licenseActivated);
        console.log("  - Stored Device ID:", storedDeviceId);
        console.log("  - Current Device ID:", id);

        // Only skip to pairing if:
        // 1. License is marked as activated locally
        // 2. Stored device ID matches current device ID
        if (licenseActivated === "true" && storedDeviceId === id) {
          console.log("✅ Local license valid, verifying with server...");
          
          // Double-check with server
          const registrationCheck = await checkDeviceRegistration(id);
          
          if (registrationCheck.found) {
            console.log("✅ Server confirms device is registered");
            
            // Ensure all data is stored
            await AsyncStorage.setItem("licenseActivated", "true");
            await AsyncStorage.setItem("licenseKey", registrationCheck.customer.license_key);
            await AsyncStorage.setItem("deviceId", id);
            await AsyncStorage.setItem("customerName", registrationCheck.customer.customer_name);
            await AsyncStorage.setItem("projectName", registrationCheck.projectName);
            await AsyncStorage.setItem("clientId", registrationCheck.customer.client_id);
            
            Toast.show({
              type: "success",
              text1: "Welcome Back! 🎉",
              text2: "Device already registered",
            });

            // Navigate to pairing screen
            setTimeout(() => {
              router.replace("/(auth)/pairing");
            }, 500);
            return; // Exit early
          } else {
            console.log("⚠️ Server says device not registered, clearing local data");
            // Clear invalid local data
            await AsyncStorage.multiRemove([
              "licenseActivated",
              "licenseKey",
              "deviceId",
              "customerName",
              "projectName",
              "clientId",
            ]);
          }
        } else {
          console.log("❌ No valid local license found");
        }

        // If we reach here, show the license activation screen
        console.log("Showing license activation screen");
        setChecking(false);
        
      } catch (error) {
        console.error("Initialization error:", error);
        setChecking(false);
      }
    };

    initializeApp();
  }, []);

  const handleActivate = async () => {
    // Validate license key
    if (!licenseKey.trim()) {
      setLicenseError(true);
      return;
    }

    if (!deviceId) {
      Alert.alert("Error", "Device ID not available. Please try again.");
      return;
    }

    setLoading(true);
    setLicenseError(false);

    try {
      // ============================================
      // STEP 1: Check if license key is valid (GET API)
      // ============================================
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/`;

      console.log("Validating license key...");
      const checkResponse = await fetch(CHECK_LICENSE_API, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const checkData = await checkResponse.json();
      console.log("Check response:", checkData);

      // Check if API call was successful
      if (!checkResponse.ok || !checkData.success) {
        Toast.show({
          type: "error",
          text1: "Validation Failed",
          text2: checkData.message || "Failed to validate license. Please try again.",
        });
        setLoading(false);
        return;
      }

      // Check if customer exists
      if (!checkData.customers || checkData.customers.length === 0) {
        Toast.show({
          type: "error",
          text1: "Invalid License",
          text2: "No customer found for this license",
        });
        setLoading(false);
        return;
      }

      // Find the customer with matching license key
      const customer = checkData.customers.find(
        (c: any) => c.license_key === licenseKey.trim()
      );

      if (!customer) {
        Toast.show({
          type: "error",
          text1: "Invalid License",
          text2: "The license key you entered is not valid",
        });
        setLoading(false);
        return;
      }

      // Check if this device is already registered for this license
      const isAlreadyRegistered = customer.registered_devices?.some(
        (device: any) => device.device_id === deviceId
      );

      if (isAlreadyRegistered) {
        // Device already registered, just save and continue
        await AsyncStorage.setItem("licenseActivated", "true");
        await AsyncStorage.setItem("licenseKey", licenseKey.trim());
        await AsyncStorage.setItem("deviceId", deviceId);
        await AsyncStorage.setItem("customerName", customer.customer_name);
        await AsyncStorage.setItem("projectName", checkData.project_name);
        await AsyncStorage.setItem("clientId", customer.client_id);

        console.log("✅ Stored client_id:", customer.client_id);

        Toast.show({
          type: "success",
          text1: "Already Registered",
          text2: `Welcome back ${customer.customer_name}!`,
        });

        setTimeout(() => {
          router.replace("/(auth)/pairing");
        }, 500);
        setLoading(false);
        return;
      }

      // Check if device limit reached
      if (
        customer.license_summary.registered_count >=
        customer.license_summary.max_devices
      ) {
        Toast.show({
          type: "error",
          text1: "License Limit Reached",
          text2: `Maximum devices (${customer.license_summary.max_devices}) already registered for this license`,
        });
        setLoading(false);
        return;
      }

      // ============================================
      // STEP 2: Register device (POST API)
      // ============================================
      const POST_DEVICE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/license/register/`;

      console.log("Registering new device...");
      console.log("License Key:", licenseKey.trim());
      console.log("Device ID:", deviceId);
      console.log("Device Name:", deviceName);

      const deviceResponse = await fetch(POST_DEVICE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          device_id: deviceId,
          device_name: deviceName,
        }),
      });

      const responseText = await deviceResponse.text();
      console.log("Raw response:", responseText);

      let deviceData;
      try {
        deviceData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        Toast.show({
          type: "error",
          text1: "Server Error",
          text2: "Invalid response from server. Please contact support.",
        });
        setLoading(false);
        return;
      }

      console.log("Device registration response:", deviceData);

      if (deviceResponse.ok && deviceData.success) {
        // Success - store activation status INCLUDING CLIENT_ID
        await AsyncStorage.setItem("licenseActivated", "true");
        await AsyncStorage.setItem("licenseKey", licenseKey.trim());
        await AsyncStorage.setItem("deviceId", deviceId);
        await AsyncStorage.setItem("customerName", customer.customer_name);
        await AsyncStorage.setItem("projectName", checkData.project_name);
        await AsyncStorage.setItem("clientId", customer.client_id);

        console.log("✅ Stored client_id:", customer.client_id);

        Toast.show({
          type: "success",
          text1: "Success! 🎉",
          text2: `Welcome ${customer.customer_name}! Device registered successfully.`,
        });

        setTimeout(() => {
          router.replace("/(auth)/pairing");
        }, 500);
      } else {
        // Handle error from device registration API
        const errorMessage =
          deviceData.message ||
          deviceData.error ||
          deviceData.detail ||
          "Failed to register device. Please try again.";

        console.error("Registration failed:", errorMessage);

        Toast.show({
          type: "error",
          text1: "Registration Failed",
          text2: errorMessage,
        });
      }
    } catch (error: any) {
      console.error("Activation error:", error);

      let errorMessage = "Network error. Please check your connection and try again.";

      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      if (
        error.name === "TypeError" &&
        error.message.includes("Network request failed")
      ) {
        errorMessage = "Cannot connect to server. Please check your internet connection.";
      }

      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle social link clicks
  const handleSocialLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", `Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
      Alert.alert("Error", "Failed to open link");
    }
  };

  // Function to handle email
  const handleEmail = async () => {
    const email = "info@imcbs.com";
    const url = `mailto:${email}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open email client");
      }
    } catch (error) {
      console.error("Error opening email:", error);
      Alert.alert("Error", "Failed to open email");
    }
  };

  // Show loading screen while checking registration
  if (checking) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FB923C" />
        <Text className="text-gray-600 mt-4 text-lg">
          Checking registration...
        </Text>
      </View>
    );
  }

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
        >
          <View className="flex-1 justify-center items-center px-5 py-10">
            {/* Header Section */}
            <View className="items-center w-full">
              <Image
                source={require("../../assets/images/icon.jpg")}
                style={{
                  width: 80,
                  height: 80,
                  marginBottom: 12,
                }}
              />
              <Text className="text-2xl font-bold mb-2 text-gray-800">
                TaskPMS
              </Text>
              <Text className="text-gray-600 mb-8 text-center">
                Activate your license
              </Text>

              {/* Main Form Card */}
              <View className="w-full max-w-[360px] bg-white rounded-2xl p-6 shadow-lg">
                <Text className="text-center text-blue-600 text-xl font-semibold mb-6">
                  License Activation
                </Text>

                {/* Activation Icon */}
                <View className="items-center mb-6">
                  <Ionicons name="key" size={48} color="#FB923C" />
                  <Text className="text-gray-600 text-center mt-3">
                    Enter your license key to activate
                  </Text>
                </View>

                {/* Device Info Display */}
                <View className="bg-gray-50 rounded-lg p-4 mb-5">
                  <Text className="text-gray-700 font-semibold mb-2">
                    Device ID
                  </Text>
                  <Text
                    className="text-gray-600 text-xs font-mono mb-3"
                    numberOfLines={1}
                  >
                    {deviceId || "Loading..."}
                  </Text>
                  <Text className="text-gray-700 font-semibold mb-2">
                    Device Name
                  </Text>
                  <Text
                    className="text-gray-600 text-xs font-mono"
                    numberOfLines={1}
                  >
                    {deviceName || "Loading..."}
                  </Text>
                </View>

                {/* License Key Field */}
                <View>
                  <Text className="text-gray-700 font-semibold mb-2">
                    License Key
                  </Text>
                  <TextInput
                    value={licenseKey}
                    onChangeText={(text) => {
                      setLicenseKey(text);
                      setLicenseError(false);
                    }}
                    placeholder="Enter your license key"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    className={`border rounded-lg px-4 py-4 text-base bg-white ${
                      licenseError ? "border-red-400" : "border-orange-300"
                    }`}
                  />
                  {licenseError && (
                    <Text className="text-red-500 text-sm mt-1">
                      Please enter a valid license key
                    </Text>
                  )}
                </View>

                {/* Activate Button */}
                <Pressable
                  onPress={handleActivate}
                  className={`rounded-lg py-4 mt-8 shadow-lg ${
                    loading ? "bg-orange-300" : "bg-green-500"
                  }`}
                  disabled={loading}
                >
                  {loading ? (
                    <View className="flex-row justify-center items-center">
                      <ActivityIndicator color="white" size="small" />
                      <Text className="text-white font-bold text-lg ml-2">
                        Validating...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-center text-white font-bold text-lg">
                      🔐 Activate License
                    </Text>
                  )}
                </Pressable>

                {/* Info Section */}
                <View className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <Text className="text-gray-700 font-semibold mb-2">
                    💡 Activation Info
                  </Text>
                  <Text className="text-gray-600 text-sm leading-5">
                    • Your license key was provided by IMC Business Solutions
                    {"\n"}• This device will be registered to your license
                    {"\n"}• You only need to activate once per device
                    {"\n"}• Contact support if you need assistance
                  </Text>
                </View>
              </View>
            </View>

            {/* Social Links Footer */}
            <View className="mt-1 items-center">
              <Text className="text-sm text-gray-500 mb-4"></Text>
              <View className="flex-row justify-center items-center space-x-6">
                {/* Website Link */}
                <TouchableOpacity
                  onPress={() => handleSocialLink("https://imcbs.com/")}
                  className="bg-gray-100 rounded-full p-3 shadow-sm"
                >
                  <Ionicons name="globe-outline" size={28} color="#FB923C" />
                </TouchableOpacity>

                {/* Facebook Link */}
                <TouchableOpacity
                  onPress={() =>
                    handleSocialLink("https://www.facebook.com/106935927735565")
                  }
                  className="bg-gray-100 rounded-full p-3 shadow-sm mx-4"
                >
                  <Ionicons name="logo-facebook" size={28} color="#1877F2" />
                </TouchableOpacity>

                {/* Email Link */}
                <TouchableOpacity
                  onPress={handleEmail}
                  className="bg-gray-100 rounded-full p-3 shadow-sm"
                >
                  <Ionicons name="mail-outline" size={28} color="#EA4335" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}