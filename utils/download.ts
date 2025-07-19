// utils/download.ts
import { createAPI } from "./api";

export async function fetchDownloadData() {
  const api = await createAPI();
  const response = await api.get("/data-download");
  return response.data;
}
