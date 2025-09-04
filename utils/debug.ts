// utils/debug.ts
import db from "./database";

export const logMasterData = async () => {
  const result = await db.getAllAsync("SELECT * FROM master_data");
  console.log("📦 Master Data:", result);
};

export const logProductData = async () => {
  const result = await db.getAllAsync("SELECT * FROM product_data");
  console.log("🛒 Product Data:", result);
};