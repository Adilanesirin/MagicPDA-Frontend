// utils/pairing.ts
import * as SecureStore from "expo-secure-store";

export async function savePairingIP(ip: string) {
  await SecureStore.setItemAsync("paired_ip", ip);
}

export async function getPairedIP() {
  return await SecureStore.getItemAsync("paired_ip");
}

export async function clearPairing() {
  await SecureStore.deleteItemAsync("paired_ip");
}