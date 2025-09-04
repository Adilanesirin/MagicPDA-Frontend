// app/_layout.tsx
import "@/global.css";
import { toastConfig } from "@/utils/toastConfig";
import { Slot } from "expo-router";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  return (
    <>
      <Slot />
      <Toast config={toastConfig} />
    </>
  );
}