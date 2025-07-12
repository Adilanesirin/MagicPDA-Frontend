// app/(tabs)/index.tsx
import { View, Text, Button } from "react-native";
import { logout } from "@/utils/auth";
import { clearPairing } from "@/utils/pairing";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    await clearPairing();
    router.replace("/(auth)/pairing");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Welcome to SyncAnywhere 👋</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
