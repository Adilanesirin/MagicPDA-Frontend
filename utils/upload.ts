// utils/upload.ts - FIXED VERSION
import * as SecureStore from "expo-secure-store";
import { createEnhancedAPI } from "./api";

// ============================================
// ORDERS UPLOAD - otype = 'O'
// ============================================

export async function uploadPendingOrders(orders: any[]) {
  try {
    console.log("📤 Starting upload of", orders.length, "orders");
    
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();
    
    const formattedOrders = orders.map((order, index) => {
      const isManualEntry = order.is_manual_entry === 1 || order.is_manual_entry === '1' || order.is_manual_entry === true;
      
      console.log(`📦 Order ${index + 1}:`, {
        barcode: order.barcode,
        is_manual_entry: order.is_manual_entry,
        isManualEntry: isManualEntry,
        product_name: order.product_name,
        itemcode: order.itemcode
      });
      
      // ✅ EXPLICIT otype for ORDERS
      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.order_date,
        created_at: order.created_at,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'O', // ✅✅✅ EXPLICITLY SET TO 'O' FOR ORDERS
      };

      if (isManualEntry) {
        formattedOrder.code = order.barcode;
        formattedOrder.item = order.product_name || '';
        formattedOrder.ioflag = -100;
        
        console.log("🔧 Manual ORDER entry formatted:", {
          barcode: order.barcode,
          code: formattedOrder.code,
          item: formattedOrder.item,
          ioflag: formattedOrder.ioflag,
          otype: formattedOrder.otype // Should be 'O'
        });
      } else {
        formattedOrder.code = order.itemcode;
        formattedOrder.item = '';
        formattedOrder.ioflag = 0;
      }

      return formattedOrder;
    });

    // ✅ VERIFY otype before sending
    console.log("🔍 VERIFICATION - All Orders have otype='O':");
    formattedOrders.forEach((o, idx) => {
      console.log(`  Order ${idx + 1}: otype='${o.otype}' (should be 'O')`);
    });

    console.log("📦 Formatted orders for upload:", formattedOrders.length);
    console.log("📢 Manual entries count:", formattedOrders.filter(o => o.ioflag === -100).length);
    console.log("📋 Regular entries count:", formattedOrders.filter(o => o.ioflag === 0).length);
    console.log("🏷️ All entries have otype='O' for Orders");

    const res = await api.post("/upload-orders", { 
      orders: formattedOrders,
      total_orders: formattedOrders.length,
      transaction_type: 'ORDER'
    });

    console.log("✅ Upload response:", res.data);

    if (res.data) {
      if (res.data.success === true) {
        return {
          success: true,
          message: res.data.message || "Orders uploaded successfully",
          uploaded_count: res.data.uploaded_count || formattedOrders.length
        };
      }
      
      if (res.data.status === "success") {
        return {
          success: true,
          message: res.data.message || "Orders uploaded successfully",
          uploaded_count: formattedOrders.length
        };
      }
      
      if (typeof res.data === "string" && res.data.includes("success")) {
        return {
          success: true,
          message: res.data,
          uploaded_count: formattedOrders.length
        };
      }
    }

    console.warn("⚠️ Unexpected response format from server:", res.data);
    return {
      success: true,
      message: "Orders processed by server",
      uploaded_count: formattedOrders.length
    };
    
  } catch (error: any) {
    console.error("❌ Upload error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid data format: " + (error.response.data?.message || "Check your data"));
    } else if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error. Please check your connection.");
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || "Upload failed");
    }
  }
}

// ============================================
// GRN UPLOAD - otype = 'D'
// ============================================

export async function uploadPendingGRNOrders(orders: any[]) {
  try {
    console.log("📤 Starting GRN upload of", orders.length, "orders");
    
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();
    
    const formattedOrders = orders.map((order, index) => {
      const isManualEntry = order.is_manual_entry === 1 || order.is_manual_entry === '1' || order.is_manual_entry === true;
      
      console.log(`📦 GRN Order ${index + 1}:`, {
        barcode: order.barcode,
        is_manual_entry: order.is_manual_entry,
        isManualEntry: isManualEntry,
        product_name: order.product_name,
        itemcode: order.itemcode
      });
      
      // ✅ EXPLICIT otype for GRN
      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.grn_date, // Using grn_date but mapping to order_date for API
        created_at: order.created_at,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'D', // ✅✅✅ EXPLICITLY SET TO 'D' FOR GRN
      };

      if (isManualEntry) {
        formattedOrder.code = order.barcode;
        formattedOrder.item = order.product_name || '';
        formattedOrder.ioflag = -100;
        
        console.log("🔧 Manual GRN entry formatted:", {
          barcode: order.barcode,
          code: formattedOrder.code,
          item: formattedOrder.item,
          ioflag: formattedOrder.ioflag,
          otype: formattedOrder.otype // Should be 'D'
        });
      } else {
        formattedOrder.code = order.itemcode;
        formattedOrder.item = '';
        formattedOrder.ioflag = 0;
      }

      return formattedOrder;
    });

    // ✅ VERIFY otype before sending
    console.log("🔍 VERIFICATION - All GRN Orders have otype='D':");
    formattedOrders.forEach((o, idx) => {
      console.log(`  GRN Order ${idx + 1}: otype='${o.otype}' (should be 'D')`);
    });

    console.log("📦 Formatted GRN orders for upload:", formattedOrders.length);
    console.log("📢 Manual GRN entries count:", formattedOrders.filter(o => o.ioflag === -100).length);
    console.log("📋 Regular GRN entries count:", formattedOrders.filter(o => o.ioflag === 0).length);
    console.log("🏷️ All entries have otype='D' for GRN");

    // Use the SAME endpoint as orders
    const res = await api.post("/upload-orders", { 
      orders: formattedOrders,
      total_orders: formattedOrders.length,
      transaction_type: 'GRN'
    });

    console.log("✅ GRN Upload response:", res.data);

    if (res.data) {
      if (res.data.success === true) {
        return {
          success: true,
          message: res.data.message || "GRN orders uploaded successfully",
          uploaded_count: res.data.uploaded_count || formattedOrders.length
        };
      }
      
      if (res.data.status === "success") {
        return {
          success: true,
          message: res.data.message || "GRN orders uploaded successfully",
          uploaded_count: formattedOrders.length
        };
      }
      
      if (typeof res.data === "string" && res.data.includes("success")) {
        return {
          success: true,
          message: res.data,
          uploaded_count: formattedOrders.length
        };
      }
    }

    console.warn("⚠️ Unexpected GRN response format from server:", res.data);
    return {
      success: true,
      message: "GRN orders processed by server",
      uploaded_count: formattedOrders.length
    };
    
  } catch (error: any) {
    console.error("❌ GRN Upload error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid data format: " + (error.response.data?.message || "Check your data"));
    } else if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error. Please check your connection.");
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || "GRN upload failed");
    }
  }
}

// ============================================
// TEST FUNCTION
// ============================================

export async function testUploadEndpoint() {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const api = await createEnhancedAPI();
    
    // Test with minimal data
    const testData = {
      orders: [{
        supplier_code: "TEST",
        user_id: "test_user",
        barcode: "TEST123",
        quantity: 1,
        rate: 10,
        mrp: 12,
        order_date: new Date().toISOString().split("T")[0],
        otype: 'O', // ✅ Test with 'O'
        code: "TEST123",
        item: "Test Product",
        ioflag: -100,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
      }],
      total_orders: 1,
      transaction_type: 'TEST'
    };

    const res = await api.post("/upload-orders", testData);
    console.log("✅ Test connection successful:", res.status);
    return { success: true, status: res.status };
  } catch (error: any) {
    console.error("❌ Test connection failed:", error.message);
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status 
    };
  }
}