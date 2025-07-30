// app/_layout.tsx
import "@/global.css";
import { Slot } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/utils/toastConfig";

export default function RootLayout() {
  return (
    <>
      <Slot />
      <Toast config={toastConfig} />
    </>
  );
}
