// app/index.tsx
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const ip = await SecureStore.getItemAsync("paired_ip");
      const token = await SecureStore.getItemAsync("token");

      if (ip && token) {
        setRedirectTo("/(tabs)"); // authenticated area
      } else {
        setRedirectTo("/(auth)/pairing"); // pairing or login screen
      }
    };

    checkAuth();
  }, []);

  if (!redirectTo) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={redirectTo as any} />;
}
