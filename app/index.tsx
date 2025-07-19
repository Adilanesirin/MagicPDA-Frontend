import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { View, Image } from "react-native";
import { initDatabase } from "@/utils/database";
import { deleteOldDatabase } from "@/utils/db-utils";

export default function Index() {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // ✅ Initialize DB
        await initDatabase();

        // ✅ Check auth values
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
        console.error("DB Init Error:", error);
      }
    };

    initializeApp();
  }, []);

  if (!redirectTo) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Image
          source={require("../assets/images/splash-icon.png")}
          className="w-40 h-40"
          resizeMode="contain"
        />
      </View>
    );
  }

  return <Redirect href={redirectTo as any} />;
}
