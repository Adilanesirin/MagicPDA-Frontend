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
        // Initialize DB
        await initDatabase();

        // Check license activation first
        const licenseActivated = await AsyncStorage.getItem("licenseActivated");
        
        if (!licenseActivated || licenseActivated !== "true") {
          // License not activated, go to license screen
          setTimeout(() => {
            setRedirectTo("/(auth)/license");
          }, 2000);
          return;
        }

        // License is activated, check pairing and auth
        const ip = await SecureStore.getItemAsync("paired_ip");
        const token = await SecureStore.getItemAsync("token");

        setTimeout(() => {
          if (ip && token) {
            setRedirectTo("/(main)/");
          } else {
            setRedirectTo("/(auth)/pairing");
          }
        }, 2000);
      } catch (error) {
        console.error("Initialization Error:", error);
        // On error, go to license screen
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