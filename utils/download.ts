// utils/download.ts
import { createEnhancedAPI } from "./api";

export async function fetchDownloadData() {
  const api = await createEnhancedAPI();
  const response = await api.get("/data-download");
  return response.data;
}
