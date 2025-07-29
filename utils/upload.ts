// utils/upload.ts
import { createAPI } from "./api";

export async function uploadPendingOrders(orders: any[]) {
  const api = await createAPI();
  const res = await api.post("/upload-orders", { orders });
  return res.data;
}
