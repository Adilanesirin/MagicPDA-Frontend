import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function License() {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deviceId, setDeviceId] = useState("");
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

  const checkDeviceRegistration = async (deviceIdToCheck: string) => {
    try {
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/sastest/`;

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
        return false;
      }

      if (!data.customers || data.customers.length === 0) {
        console.log("No customers found");
        return false;
      }

      // Check if this device is registered
      for (const customer of data.customers) {
        if (customer.registered_devices && customer.registered_devices.length > 0) {
          const deviceFound = customer.registered_devices.some(
            (device: any) => device.device_id === deviceIdToCheck
          );

          if (deviceFound) {
            console.log("Device found in customer:", customer.customer_name);

            // Store customer info
            await AsyncStorage.setItem("licenseActivated", "true");
            await AsyncStorage.setItem("licenseKey", customer.license_key);
            await AsyncStorage.setItem("deviceId", deviceIdToCheck);
            await AsyncStorage.setItem("customerName", customer.customer_name);
            await AsyncStorage.setItem("projectName", data.project_name);
            await AsyncStorage.setItem("clientId", customer.client_id);

            return true;
          }
        }
      }

      console.log("Device not found in any customer");
      return false;
    } catch (error) {
      console.error("Error checking device registration:", error);
      return false;
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setChecking(true);

        const id = await getDeviceId();
        setDeviceId(id);

        console.log("Checking if device is already registered...");
        console.log("Device ID:", id);

        const isRegistered = await checkDeviceRegistration(id);

        if (isRegistered) {
          console.log("Device already registered, skipping license screen");
          Toast.show({
            type: "success",
            text1: "Welcome Back! 🎉",
            text2: "Device already registered",
          });
          
          // Navigate to pairing screen
          setTimeout(() => {
            router.replace("/(auth)/pairing");
          }, 500);
        } else {
          console.log("Device not registered, showing license screen");
          setChecking(false);
        }
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
      // STEP 1: Check if license key is valid
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

      if (!checkResponse.ok || !checkData.success) {
        Toast.show({
          type: "error",
          text1: "Validation Failed",
          text2: checkData.message || "Failed to validate license",
        });
        setLoading(false);
        return;
      }

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

      // Check if device already registered
      const isAlreadyRegistered = customer.registered_devices?.some(
        (device: any) => device.device_id === deviceId
      );

      if (isAlreadyRegistered) {
        await AsyncStorage.setItem("licenseActivated", "true");
        await AsyncStorage.setItem("licenseKey", licenseKey.trim());
        await AsyncStorage.setItem("deviceId", deviceId);
        await AsyncStorage.setItem("customerName", customer.customer_name);
        await AsyncStorage.setItem("projectName", checkData.project_name);
        await AsyncStorage.setItem("clientId", customer.client_id);

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

      // Check device limit
      if (
        customer.license_summary.registered_count >=
        customer.license_summary.max_devices
      ) {
        Toast.show({
          type: "error",
          text1: "License Limit Reached",
          text2: `Maximum devices (${customer.license_summary.max_devices}) already registered`,
        });
        setLoading(false);
        return;
      }

      // STEP 2: Register device
      const POST_DEVICE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/license/register/`;

      console.log("Registering new device...");
      const deviceResponse = await fetch(POST_DEVICE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          device_id: deviceId,
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
          text2: "Invalid response from server",
        });
        setLoading(false);
        return;
      }

      console.log("Device registration response:", deviceData);

      if (deviceResponse.ok && deviceData.success) {
        // Success - store activation status
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
          text2: `Welcome ${customer.customer_name}!`,
        });

        setTimeout(() => {
          router.replace("/(auth)/pairing");
        }, 500);
      } else {
        const errorMessage =
          deviceData.message ||
          deviceData.error ||
          deviceData.detail ||
          "Failed to register device";

        console.error("Registration failed:", errorMessage);

        Toast.show({
          type: "error",
          text1: "Registration Failed",
          text2: errorMessage,
        });
      }
    } catch (error: any) {
      console.error("Activation error:", error);

      let errorMessage = "Network error. Please check your connection.";

      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      if (
        error.name === "TypeError" &&
        error.message.includes("Network request failed")
      ) {
        errorMessage = "Cannot connect to server. Check your internet connection.";
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
                    className="text-gray-600 text-xs font-mono"
                    numberOfLines={1}
                  >
                    {deviceId || "Loading..."}
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
                      🔑 Activate License
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

            {/* Footer */}
            <View className="mt-8">
              <Text className="text-sm text-gray-400 text-center">
                Powered by IMC Business Solutions
              </Text>
              <Text className="text-xs text-gray-400 text-center mt-1">
                By activating, you agree to our terms of service
              </Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}