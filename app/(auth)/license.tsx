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
  PermissionsAndroid,
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
  const [permissionError, setPermissionError] = useState(false);

  const router = useRouter();

  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: "Device ID Permission",
          message: "This app needs access to your device ID for license activation.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("✅ Phone state permission granted");
        setPermissionError(false);
        return true;
      } else {
        console.log("❌ Phone state permission denied");
        setPermissionError(true);
        return false;
      }
    } catch (err) {
      console.warn("Permission request error:", err);
      setPermissionError(true);
      return false;
    }
  };

  // FIXED: Always try to get fresh Android ID first when permission is granted
  const getDeviceId = async (): Promise<string> => {
    try {
      let id = null;
      
      if (Platform.OS === "android") {
        // FIXED: Request permission FIRST before checking stored ID
        const hasPermission = await requestAndroidPermissions();
        
        if (!hasPermission) {
          console.log("⚠️ Permission not granted, using stored or generated ID");
          // Try stored ID first if permission denied
          const storedId = await AsyncStorage.getItem("device_hardware_id");
          if (storedId) {
            console.log("✅ Using stored device ID (no permission):", storedId);
            return storedId;
          }
          
          // Generate a UUID as fallback
          const uuid = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return r.toString(16);
          });
          
          await AsyncStorage.setItem("device_hardware_id", uuid);
          console.log("✅ Generated and stored UUID (no permission):", uuid);
          return uuid;
        }

        // FIXED: Try to get fresh Android ID FIRST when permission is granted
        id = Application.androidId;
        console.log("📱 Application.androidId:", id);
        
        if (id && id !== "null" && id !== "" && id !== "unknown") {
          console.log("✅ Using fresh Application.androidId:", id);
          // Store this as the official device ID
          await AsyncStorage.setItem("device_hardware_id", id);
          // Also store in separate key for license-specific ID
          await AsyncStorage.setItem("license_device_id", id);
          return id;
        }

        // Fallback to stored ID if Android ID fails
        const storedId = await AsyncStorage.getItem("device_hardware_id");
        if (storedId) {
          console.log("⚠️ Android ID not available, using stored ID:", storedId);
          return storedId;
        }

        // Final fallback: Generate UUID
        console.log("⚠️ Android ID not available, generating UUID");
        const uuid = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
          const r = Math.random() * 16 | 0;
          return r.toString(16);
        });
        
        await AsyncStorage.setItem("device_hardware_id", uuid);
        console.log("✅ Generated and stored UUID:", uuid);
        return uuid;
        
      } else if (Platform.OS === "ios") {
        // iOS: Try to get IDFV first
        id = await Application.getIosIdForVendorAsync();
        
        console.log("iOS IDFV:", id);
        
        if (id && id !== "null" && id !== "") {
          console.log("✅ Using iOS IDFV:", id);
          await AsyncStorage.setItem("device_hardware_id", id);
          await AsyncStorage.setItem("license_device_id", id);
          return id;
        }

        // Fallback to stored ID
        const storedId = await AsyncStorage.getItem("device_hardware_id");
        if (storedId) {
          console.log("✅ Using stored iOS device ID:", storedId);
          return storedId;
        }

        // Generate UUID for iOS fallback
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        
        await AsyncStorage.setItem("device_hardware_id", uuid);
        console.log("✅ Generated and stored iOS UUID:", uuid);
        return uuid;
        
      } else {
        throw new Error("Unsupported platform: " + Platform.OS);
      }
      
    } catch (error) {
      console.error("❌ ERROR getting device ID:", error);
      
      // Emergency fallback
      try {
        const storedId = await AsyncStorage.getItem("device_hardware_id");
        if (storedId) {
          console.log("Using emergency stored device ID");
          return storedId;
        }
      } catch (e) {
        console.error("Storage error:", e);
      }
      
      // Final fallback: Generate UUID
      const fallbackUuid = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
        const r = Math.random() * 16 | 0;
        return r.toString(16);
      });
      
      console.log("⚠️ Using emergency fallback UUID:", fallbackUuid);
      try {
        await AsyncStorage.setItem("device_hardware_id", fallbackUuid);
      } catch (e) {
        console.error("Failed to store fallback UUID:", e);
      }
      return fallbackUuid;
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
      
      console.log("📱 Device Name:", name);
      return name;
    } catch (error) {
      console.error("Error getting device name:", error);
      return "Unknown Device";
    }
  };

  const checkDeviceRegistration = async (deviceIdToCheck: string) => {
    try {
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/`;

      console.log("🔍 Checking device registration for:", deviceIdToCheck);

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

      for (const customer of data.customers) {
        if (customer.registered_devices && customer.registered_devices.length > 0) {
          const deviceFound = customer.registered_devices.some(
            (device: any) => device.device_id === deviceIdToCheck
          );

          if (deviceFound) {
            console.log("✅ Device found in customer:", customer.customer_name);
            return {
              found: true,
              customer: customer,
              projectName: data.project_name
            };
          }
        }
      }

      console.log("❌ Device not found in any customer");
      return { found: false };
    } catch (error) {
      console.error("Error checking device registration:", error);
      return { found: false };
    }
  };

  const storeLicenseDataSafely = async (data: {
    licenseKey: string;
    deviceId: string;
    customerName: string;
    projectName: string;
    clientId: string;
  }): Promise<boolean> => {
    try {
      console.log("💾 Storing license data...");
      console.log("  - License Key:", data.licenseKey);
      console.log("  - Device ID:", data.deviceId);
      console.log("  - Client ID:", data.clientId);
      console.log("  - Customer:", data.customerName);

      // Store in multiple keys for compatibility
      await AsyncStorage.multiSet([
        ["licenseActivated", "true"],
        ["licenseKey", data.licenseKey],
        ["deviceId", data.deviceId],
        ["license_device_id", data.deviceId], // NEW: Store same ID in separate key
        ["customerName", data.customerName],
        ["projectName", data.projectName],
        ["clientId", data.clientId],
      ]);

      const verification = await AsyncStorage.multiGet([
        "licenseActivated",
        "licenseKey",
        "deviceId",
        "license_device_id",
        "customerName",
        "projectName",
        "clientId",
      ]);

      console.log("✅ Storage verification:");
      verification.forEach(([key, value]) => {
        console.log(`   - ${key}: ${value || "NULL"}`);
      });

      const allStored = verification.every(([_, value]) => value !== null);

      if (allStored) {
        console.log("✅ All license data stored successfully");
        return true;
      } else {
        console.error("❌ Some license data failed to store");
        return false;
      }
    } catch (error) {
      console.error("❌ Error storing license data:", error);
      return false;
    }
  };

  const initializeApp = async () => {
    try {
      setChecking(true);

      // Get device information (using the FIXED function)
      const id = await getDeviceId();
      setDeviceId(id);

      const name = await getDeviceName();
      setDeviceName(name);

      console.log("=== LICENSE SCREEN DEVICE INFO ===");
      console.log("Device ID:", id);
      console.log("Device Name:", name);
      console.log("Platform:", Platform.OS);
      console.log("Is Physical Device:", Device.isDevice);

      // Check AsyncStorage for license activation status
      const licenseActivated = await AsyncStorage.getItem("licenseActivated");
      const storedDeviceId = await AsyncStorage.getItem("deviceId");
      const storedLicenseKey = await AsyncStorage.getItem("licenseKey");
      const storedClientId = await AsyncStorage.getItem("clientId");
      
      console.log("📱 Local License Status:");
      console.log("  - License Activated:", licenseActivated);
      console.log("  - Stored Device ID:", storedDeviceId);
      console.log("  - Current Device ID:", id);
      console.log("  - License Key:", storedLicenseKey ? "exists" : "none");
      console.log("  - Client ID:", storedClientId ? "exists" : "none");
      console.log("  - Device IDs Match:", storedDeviceId === id);

      // FIXED: Handle device ID mismatch by SYNCING instead of rejecting
      if (storedDeviceId && storedDeviceId !== id) {
        console.log("⚠️ DEVICE ID MISMATCH DETECTED!");
        console.log("   Stored Device ID:", storedDeviceId);
        console.log("   Current Device ID:", id);
        console.log("   Syncing to new device ID...");
        
        // Instead of clearing license, update the device ID
        if (licenseActivated === "true" && storedLicenseKey && storedClientId) {
          console.log("✅ License exists, updating device ID...");
          
          // Check if the new device ID is already registered
          const registrationCheck = await checkDeviceRegistration(id);
          
          if (registrationCheck.found) {
            console.log("✅ New device ID already registered, updating local storage");
            await storeLicenseDataSafely({
              licenseKey: storedLicenseKey,
              deviceId: id,
              customerName: await AsyncStorage.getItem("customerName") || "",
              projectName: await AsyncStorage.getItem("projectName") || "",
              clientId: storedClientId,
            });
            
            Toast.show({
              type: "success",
              text1: "Device Updated",
              text2: "License transferred to this device",
            });
            
            setTimeout(() => {
              router.replace("/(auth)/pairing");
            }, 500);
            setChecking(false);
            return;
          } else {
            console.log("⚠️ New device ID not registered, keeping old license");
            // Keep old license but update device ID for future
            await AsyncStorage.setItem("deviceId", id);
            await AsyncStorage.setItem("license_device_id", id);
          }
        } else {
          // No valid license found, proceed to activation
          console.log("No valid license found, showing activation screen");
        }
      }

      if (licenseActivated === "true" && storedLicenseKey && storedClientId) {
        console.log("✅ Complete local license found");
        console.log("   Verifying with server...");
        
        const registrationCheck = await checkDeviceRegistration(id);
        
        if (registrationCheck.found) {
          console.log("✅ Server confirms device is registered");
          console.log("   Customer:", registrationCheck.customer.customer_name);
          console.log("   License Status:", registrationCheck.customer.status);
          
          const storeSuccess = await storeLicenseDataSafely({
            licenseKey: registrationCheck.customer.license_key,
            deviceId: id,
            customerName: registrationCheck.customer.customer_name,
            projectName: registrationCheck.projectName,
            clientId: registrationCheck.customer.client_id,
          });

          if (!storeSuccess) {
            console.error("❌ Failed to verify storage");
            Toast.show({
              type: "error",
              text1: "Storage Error",
              text2: "Please try activating again",
            });
            setChecking(false);
            return;
          }
          
          Toast.show({
            type: "success",
            text1: "Welcome Back! 🎉",
            text2: `${registrationCheck.customer.customer_name}`,
            visibilityTime: 2000,
          });

          setTimeout(() => {
            router.replace("/(auth)/pairing");
          }, 500);
          return;
        } else {
          console.log("⚠️ Device not found on server");
          console.log("   License may have been revoked or expired");
          
          // Don't clear license yet, let user try to activate again
          Toast.show({
            type: "info",
            text1: "License Not Found",
            text2: "Please activate your license again",
          });
        }
      }

      console.log("Showing license activation screen");
      setChecking(false);
      
    } catch (error) {
      console.error("Initialization error:", error);
      setChecking(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const handleRetryPermission = async () => {
    setPermissionError(false);
    const hasPermission = await requestAndroidPermissions();
    
    if (hasPermission) {
      // Refresh device ID with permission
      const id = await getDeviceId();
      setDeviceId(id);
      Toast.show({
        type: "success",
        text1: "Permission Granted",
        text2: "You can now activate your license",
      });
    } else {
      Toast.show({
        type: "info",
        text1: "Permission Denied",
        text2: "A unique device ID will be generated instead",
      });
      // Still get device ID (will use fallback UUID)
      const id = await getDeviceId();
      setDeviceId(id);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setLicenseError(true);
      return;
    }

    if (!deviceId) {
      Alert.alert(
        "Device ID Error",
        "Device ID not available. Please restart the app.",
        [
          {
            text: "Retry",
            onPress: async () => {
              const id = await getDeviceId();
              setDeviceId(id);
            }
          },
          { text: "OK" }
        ]
      );
      return;
    }

    setLoading(true);
    setLicenseError(false);

    try {
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/`;

      console.log("=== LICENSE ACTIVATION START ===");
      console.log("License Key:", licenseKey.trim());
      console.log("Device ID:", deviceId);
      console.log("Device Name:", deviceName);
      console.log("Platform:", Platform.OS);
      console.log("Is Physical Device:", Device.isDevice);

      const checkResponse = await fetch(CHECK_LICENSE_API, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok || !checkData.success) {
        Toast.show({
          type: "error",
          text1: "Validation Failed",
          text2: checkData.message || "Failed to validate license.",
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

      console.log("✅ License key valid for customer:", customer.customer_name);
      console.log("Client ID:", customer.client_id);

      const isAlreadyRegistered = customer.registered_devices?.some(
        (device: any) => device.device_id === deviceId
      );

      if (isAlreadyRegistered) {
        console.log("✅ Device already registered");
        
        const storeSuccess = await storeLicenseDataSafely({
          licenseKey: licenseKey.trim(),
          deviceId: deviceId,
          customerName: customer.customer_name,
          projectName: checkData.project_name,
          clientId: customer.client_id,
        });

        if (!storeSuccess) {
          Toast.show({
            type: "error",
            text1: "Storage Error",
            text2: "Failed to save license data. Please try again.",
          });
          setLoading(false);
          return;
        }

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

      console.log("📝 Registering new device...");
      const registrationPayload = {
        license_key: licenseKey.trim(),
        device_id: deviceId,
        device_name: deviceName,
        client_id: customer.client_id
      };
      console.log(JSON.stringify(registrationPayload, null, 2));

      const POST_DEVICE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/license/register/`;

      const deviceResponse = await fetch(POST_DEVICE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationPayload),
      });

      const deviceData = await deviceResponse.json();
      console.log("Registration response:", deviceData);

      if (deviceResponse.ok && deviceData.success) {
        console.log("✅ Device registered successfully");
        
        const storeSuccess = await storeLicenseDataSafely({
          licenseKey: licenseKey.trim(),
          deviceId: deviceId,
          customerName: customer.customer_name,
          projectName: checkData.project_name,
          clientId: customer.client_id,
        });

        if (!storeSuccess) {
          Toast.show({
            type: "error",
            text1: "Storage Error",
            text2: "Registration succeeded but failed to save. Please activate again.",
          });
          setLoading(false);
          return;
        }

        Toast.show({
          type: "success",
          text1: "Success! 🎉",
          text2: `Welcome ${customer.customer_name}!`,
        });

        setTimeout(() => {
          router.replace("/(auth)/pairing");
        }, 500);
      } else {
        Toast.show({
          type: "error",
          text1: "Registration Failed",
          text2: deviceData.message || "Failed to register device.",
        });
      }
    } catch (error: any) {
      console.error("Activation error:", error);
      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: "Network error. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
  };

  const handleEmail = async () => {
    try {
      await Linking.openURL("mailto:info@imcbs.com");
    } catch (error) {
      Alert.alert("Error", "Failed to open email");
    }
  };

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

  // Show permission error dialog
  if (permissionError && Platform.OS === 'android') {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <View className="bg-red-50 p-6 rounded-2xl items-center">
          <Ionicons name="warning" size={64} color="#EF4444" />
          <Text className="text-xl font-bold text-gray-800 mt-4 text-center">
            Device ID Permission
          </Text>
          <Text className="text-gray-600 mt-3 text-center leading-6">
            Permission denied. Please grant phone state permission to use this app.
          </Text>
          <Text className="text-gray-500 text-sm mt-3 text-center leading-5">
            Don't worry - if you deny this, we'll generate a unique ID for your device instead.
          </Text>
          <Pressable
            onPress={handleRetryPermission}
            className="bg-orange-500 rounded-lg py-3 px-8 mt-6"
          >
            <Text className="text-white font-bold text-base">
              RETRY
            </Text>
          </Pressable>
          <TouchableOpacity
            onPress={() => {
              setPermissionError(false);
              initializeApp();
            }}
            className="mt-4"
          >
            <Text className="text-gray-500 underline">
              Continue without permission
            </Text>
          </TouchableOpacity>
        </View>
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
            <View className="mt-8 items-center">
              <View className="flex-row justify-center items-center space-x-6">
                <TouchableOpacity
                  onPress={() => handleSocialLink("https://imcbs.com/")}
                  className="bg-gray-100 rounded-full p-3 shadow-sm"
                >
                  <Ionicons name="globe-outline" size={28} color="#FB923C" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleSocialLink("https://www.facebook.com/106935927735565")
                  }
                  className="bg-gray-100 rounded-full p-3 shadow-sm mx-4"
                >
                  <Ionicons name="logo-facebook" size={28} color="#1877F2" />
                </TouchableOpacity>

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