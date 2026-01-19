import { initDatabase } from "@/utils/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Image, View } from "react-native";

export default function Index() {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // ✅ Initialize DB
        await initDatabase();

        // ✅ STEP 1: Check if user is logged in (most frequent check)
        const isLoggedIn = await SecureStore.getItemAsync("userLoggedIn");
        
        if (isLoggedIn === "true") {
          console.log("✅ User already logged in - Redirecting to Main");
          setTimeout(() => {
            setRedirectTo("/(main)/");
          }, 2000);
          return;
        }

        // ✅ STEP 2: Check pairing status
        const ip = await SecureStore.getItemAsync("paired_ip");
        const token = await SecureStore.getItemAsync("token");

        console.log("📱 App Initialization:");
        console.log("  - Paired IP:", ip ? "exists" : "none");
        console.log("  - Token:", token ? "exists" : "none");

        if (ip && token) {
          // Paired but not logged in - go to login
          console.log("✅ Device paired - Redirecting to Login");
          setTimeout(() => {
            setRedirectTo("/(auth)/login");
          }, 2000);
          return;
        }

        // ✅ STEP 3: Check if license is activated
        const licenseActivated = await AsyncStorage.getItem("licenseActivated");
        const storedDeviceId = await AsyncStorage.getItem("deviceId");
        const clientId = await AsyncStorage.getItem("clientId");
        const licenseKey = await AsyncStorage.getItem("licenseKey");
        
        console.log("  - License Activated:", licenseActivated);
        console.log("  - Device ID:", storedDeviceId);
        console.log("  - Client ID:", clientId);
        console.log("  - License Key:", licenseKey ? "exists" : "none");

        // ❌ If NO license data at all, go to license page
        if (!licenseActivated || !storedDeviceId || !clientId || !licenseKey) {
          console.log("❌ No valid license - Redirecting to License page");
          setTimeout(() => {
            setRedirectTo("/(auth)/license");
          }, 2000);
          return;
        }

        // ✅ License data exists, verify with server
        console.log("✅ License data found locally, verifying with server...");
        
        try {
          const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskpms/`;
          const response = await fetch(CHECK_LICENSE_API, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          const data = await response.json();

          if (response.ok && data.success && data.customers) {
            const customer = data.customers.find(
              (c: any) => c.client_id === clientId
            );

            if (customer) {
              // Check if device is still registered
              const deviceStillRegistered = customer.registered_devices?.some(
                (device: any) => device.device_id === storedDeviceId
              );

              if (!deviceStillRegistered) {
                console.log("⚠️ Device no longer registered - Clearing license");
                await AsyncStorage.multiRemove([
                  "licenseActivated",
                  "licenseKey",
                  "deviceId",
                  "customerName",
                  "projectName",
                  "clientId",
                ]);
                setTimeout(() => {
                  setRedirectTo("/(auth)/license");
                }, 2000);
                return;
              }

              // Check if license is still active
              if (customer.status?.toLowerCase() !== "active") {
                console.log("⚠️ License not active - Status:", customer.status);
                await AsyncStorage.multiRemove([
                  "licenseActivated",
                  "licenseKey",
                  "deviceId",
                  "customerName",
                  "projectName",
                  "clientId",
                ]);
                setTimeout(() => {
                  setRedirectTo("/(auth)/license");
                }, 2000);
                return;
              }

              console.log("✅ License verified successfully");
              console.log("  - Customer:", customer.customer_name);
              console.log("  - Status:", customer.status);
            } else {
              console.log("⚠️ Customer not found - Clearing license");
              await AsyncStorage.multiRemove([
                "licenseActivated",
                "licenseKey",
                "deviceId",
                "customerName",
                "projectName",
                "clientId",
              ]);
              setTimeout(() => {
                setRedirectTo("/(auth)/license");
              }, 2000);
              return;
            }
          }
        } catch (error) {
          console.log("⚠️ Could not verify license with server:", error);
          // ✅ Continue anyway - offline scenario, user was previously authenticated
          console.log("✅ Using cached license data (offline mode)");
        }

        // ✅ Licensed but not paired - go to pairing
        console.log("✅ Licensed but not paired - Redirecting to Pairing");
        setTimeout(() => {
          setRedirectTo("/(auth)/pairing");
        }, 2000);

      } catch (error) {
        console.error("❌ App Init Error:", error);
        // On error, safe fallback to license page
        setTimeout(() => {
          setRedirectTo("/(auth)/license");
        }, 2000);
      }
    };

    initializeApp();
  }, []);

  if (!redirectTo) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Image
          source={require("../assets/images/splash-icon.jpg")}
          className="w-40 h-40"
          resizeMode="contain"
        />
      </View>
    );
  }

  return <Redirect href={redirectTo as any} />;
}