import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Function to dynamically create an axios instance
export async function createAPI() {
  const ip = await SecureStore.getItemAsync("paired_ip"); // get saved IP
  const token = await SecureStore.getItemAsync("token");

  if (!ip) throw new Error("No paired IP found.");

  const instance = axios.create({
    baseURL: `http://${ip}:8000`, // use user-saved IP
    timeout: 5000,
  });

  instance.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}
