// utils/upload.ts
import { createEnhancedAPI } from "./api";

export async function uploadPendingOrders(orders: any[]) {
  const api = await createEnhancedAPI();
  const res = await api.post("/upload-orders", { orders });
  return res.data;
}
