// utils/auth.ts
import * as SecureStore from "expo-secure-store";

// Save token and mark user as logged in
export async function saveToken(token: string) {
  await SecureStore.setItemAsync("token", token);
  await SecureStore.setItemAsync("userLoggedIn", "true"); // Mark user as logged in
  console.log("✅ Token saved and user marked as logged in");
}

export async function getToken() {
  return await SecureStore.getItemAsync("token");
}

export async function logout() {
  await SecureStore.deleteItemAsync("token");
  await SecureStore.deleteItemAsync("userLoggedIn"); // Clear login flag
  console.log("✅ User logged out, tokens cleared");
}

export async function saveUserid(user_id: string) {
  await SecureStore.setItemAsync("user_id", user_id);
}

export async function getUserid() {
  return await SecureStore.getItemAsync("user_id");
}

export async function deleteUserid() {
  await SecureStore.deleteItemAsync("user_id");
}

// Check if user is logged in
export async function isUserLoggedIn(): Promise<boolean> {
  const loggedIn = await SecureStore.getItemAsync("userLoggedIn");
  const token = await SecureStore.getItemAsync("token");
  return loggedIn === "true" && !!token;
}