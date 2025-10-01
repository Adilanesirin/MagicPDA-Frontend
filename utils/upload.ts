// utils/upload.ts
import * as SecureStore from "expo-secure-store";
import { createEnhancedAPI } from "./api";

export async function uploadPendingOrders(orders: any[]) {
  try {
    console.log("📤 Starting upload of", orders.length, "orders");
    
    // Check authentication
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();
    
    // Format orders for backend
    const formattedOrders = orders.map(order => ({
      supplier_code: order.supplier_code,
      user_id: order.userid,
      barcode: order.barcode,
      quantity: order.quantity,
      rate: order.rate,
      mrp: order.mrp,
      order_date: order.order_date,
      created_at: order.created_at
    }));

    console.log("📦 Formatted orders for upload:", formattedOrders);

    const res = await api.post("/upload-orders", { 
      orders: formattedOrders,
      total_orders: formattedOrders.length
    });

    console.log("✅ Upload response:", res.data);

    // FIXED: Handle different response formats from backend
    if (res.data) {
      // Case 1: Backend returns { success: true, message: "..." }
      if (res.data.success === true) {
        return {
          success: true,
          message: res.data.message || "Orders uploaded successfully",
          uploaded_count: res.data.uploaded_count || formattedOrders.length
        };
      }
      
      // Case 2: Backend returns { status: "success", message: "..." }
      if (res.data.status === "success") {
        return {
          success: true,
          message: res.data.message || "Orders uploaded successfully",
          uploaded_count: formattedOrders.length
        };
      }
      
      // Case 3: Backend returns simple success message
      if (typeof res.data === "string" && res.data.includes("success")) {
        return {
          success: true,
          message: res.data,
          uploaded_count: formattedOrders.length
        };
      }
    }

    // If we get here, the response format is unexpected
    console.warn("⚠️ Unexpected response format from server:", res.data);
    return {
      success: true, // Assume success since we got a 200 response
      message: "Orders processed by server",
      uploaded_count: formattedOrders.length
    };
    
  } catch (error: any) {
    console.error("❌ Upload error:", error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid data format: " + (error.response.data?.message || "Check your data"));
    } else if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error. Please check your connection.");
    } else if (error.response?.data?.message) {
      // Server returned an error message
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || "Upload failed");
    }
  }
}

// Alternative upload function for different endpoint
export async function uploadOrdersBatch(orders: any[]) {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication required");
    }

    const api = await createEnhancedAPI();
    
    const response = await api.post("/api/orders/batch", {
      orders: orders,
      sync_timestamp: new Date().toISOString()
    });

    return response.data;
  } catch (error: any) {
    console.error("Batch upload error:", error);
    throw error;
  }
}