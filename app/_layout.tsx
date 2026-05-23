// app/_layout.tsx
import "@/global.css";
import { initDatabase } from "@/utils/database";
import { toastConfig } from "@/utils/toastConfig";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Toast from "react-native-toast-message";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => {
        setDbReady(true);
        SplashScreen.hideAsync();
      })
      .catch((e) => {
        console.error("❌ DB init failed:", e);
        setDbReady(true); // still proceed
        SplashScreen.hideAsync();
      });
  }, []);

  if (!dbReady) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  return (
    <>
      <Slot />
      <Toast config={toastConfig} />
    </>
  );
}