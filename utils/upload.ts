// utils/upload.ts - COMPLETE VERSION WITH RELIABLE CHRONOLOGICAL SORTING
import * as SecureStore from "expo-secure-store";
import { createEnhancedAPI } from "./api";

// ✅ IMPROVED SORTING FUNCTION - Ensures chronological order with fallback
const sortChronologically = (items: any[]) => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    
    // Primary sort: by created_at timestamp
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    
    // Secondary sort: by database ID (row insertion order) if timestamps are equal
    return (a.id || 0) - (b.id || 0);
  });
};

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
      
      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.order_date,
        created_at: order.created_at,
        original_index: index, // ✅ Preserve original order from database
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'O',
      };

     const isFullyManual = order.is_manual_entry === 1 || order.is_manual_entry === '1';
const isNewBarcodeExistingName = order.is_manual_entry === 2 || order.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -101;
} else if (isFullyManual) {
  const hasBarcode = order.barcode && order.barcode !== '' && order.barcode !== 'NULL';
  formattedOrder.code = hasBarcode ? order.barcode : '';
  formattedOrder.barcode = hasBarcode ? order.barcode : '';
  formattedOrder.item = order.product_name || '';
  formattedOrder.itemdetails = order.product_name || '';
  formattedOrder.text1 = order.text1 || '';
  formattedOrder.ioflag = -100;
}
else {
   formattedOrder.code = order.itemcode;
  formattedOrder.barcode = order.barcode || '';
  formattedOrder.item = '';
  formattedOrder.text1 = order.text1 || '';
  formattedOrder.ioflag = 0;
}

      return formattedOrder;
    });

    // ✅ Use improved sorting function
    const sortedOrders = sortChronologically(formattedOrders);

    // ✅ Verify order
    console.log("📋 Upload order verification:");
    sortedOrders.slice(0, 5).forEach((order, idx) => {
      console.log(`  ${idx + 1}. ${order.item || order.code} (Created: ${order.created_at}, Index: ${order.original_index})`);
    });
    if (sortedOrders.length > 5) {
      console.log(`  ... and ${sortedOrders.length - 5} more`);
    }

    console.log("🏷️ All entries have otype='O' for Orders");

    const res = await api.post("/upload-orders", { 
      orders: sortedOrders,
      total_orders: sortedOrders.length,
      transaction_type: 'ORDER',
      upload_sequence: 'chronological'
    });

    console.log("✅ Upload response:", res.data);

    if (res.data) {
      if (res.data.success === true) {
        return {
          success: true,
          message: res.data.message || "Orders uploaded successfully",
          uploaded_count: res.data.uploaded_count || sortedOrders.length,
          original_order_preserved: true
        };
      }
      
      if (res.data.status === "success") {
        return {
          success: true,
          message: res.data.message || "Orders uploaded successfully",
          uploaded_count: sortedOrders.length,
          original_order_preserved: true
        };
      }
      
      if (typeof res.data === "string" && res.data.includes("success")) {
        return {
          success: true,
          message: res.data,
          uploaded_count: sortedOrders.length,
          original_order_preserved: true
        };
      }
    }

    console.warn("⚠️ Unexpected response format from server:", res.data);
    return {
      success: true,
      message: "Orders processed by server",
      uploaded_count: sortedOrders.length,
      original_order_preserved: true
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
// STOCK COUNT UPLOAD - otype = 'ST'
// ============================================

export async function uploadPendingStockCounts(counts: any[]) {
  try {
    console.log("📤 Starting stock count upload of", counts.length, "records");

    const token = await SecureStore.getItemAsync("token");
    if (!token) throw new Error("Authentication token not found. Please login again.");

  const api = await createEnhancedAPI();

    const orders = counts.map((count) => ({
      item:    count.itemcode || count.barcode,
      barcode: count.barcode,
      qty:     count.quantity,
      mrp:     count.mrp || 0,
      remark:  count.product_name || "Physical stock count",
      date1:   count.count_date || "",
      text1:   count.text1 || null,
    }));

    const res = await api.post("/stock-upload", { orders });

    return {
      success: true,
      message: res.data?.message || "Stock counts uploaded successfully",
      uploaded_count: orders.length,
      status: "success",
    };
  } catch (error: any) {
    console.error("❌ STOCK COUNT UPLOAD FAILED:", error.response?.data || error.message);
    if (error.response?.status === 401) throw new Error("Authentication failed. Please login again.");
    else if (error.response?.status === 400) throw new Error("Invalid data: " + (error.response.data?.message || "Check your data"));
    else if (error.code === "NETWORK_ERROR") throw new Error("Network error. Check your connection.");
    else throw new Error(error.message || "Upload failed");
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
      
      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.grn_date,
        created_at: order.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'D',
        description: order.description || '',
        itemdetails: order.product_name || '', 

      };

     const isFullyManual = order.is_manual_entry === 1 || order.is_manual_entry === '1';
const isNewBarcodeExistingName = order.is_manual_entry === 2 || order.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -101;
} else if (isFullyManual) {
  const hasBarcode = order.barcode && order.barcode !== '' && order.barcode !== 'NULL';
  formattedOrder.code = hasBarcode ? order.barcode : '';
  formattedOrder.barcode = hasBarcode ? order.barcode : '';
  formattedOrder.item = order.product_name || '';
  formattedOrder.itemdetails = order.product_name || '';
  formattedOrder.text1 = order.text1 || '';
  formattedOrder.ioflag = -100;
}
else {
   formattedOrder.code = order.itemcode;
  formattedOrder.barcode = order.barcode || '';
  formattedOrder.item = '';
  formattedOrder.text1 = order.text1 || '';
  formattedOrder.ioflag = 0;
}
      return formattedOrder;
    });

     const sortedOrders = sortChronologically(formattedOrders);

    console.log("📋 GRN Upload order verification:");
    sortedOrders.slice(0, 5).forEach((order, idx) => {
      console.log(`  ${idx + 1}. ${order.item || order.code} (Created: ${order.created_at}, Index: ${order.original_index})`);
    });
    if (sortedOrders.length > 5) {
      console.log(`  ... and ${sortedOrders.length - 5} more`);
    }

    console.log("🏷️ All entries have otype='D' for GRN");

    const res = await api.post("/upload-orders", {
      orders: sortedOrders,
      total_orders: sortedOrders.length,
      transaction_type: 'GRN',
      upload_sequence: 'chronological'
    });

    console.log("✅ GRN Upload response:", res.data);

    if (res.data?.success === true) {
      return {
        success: true,
        message: res.data.message || "GRN orders uploaded successfully",
        uploaded_count: res.data.uploaded_count || sortedOrders.length,
        original_order_preserved: true
      };
    }
    if (res.data?.status === "success") {
      return {
        success: true,
        message: res.data.message || "GRN orders uploaded successfully",
        uploaded_count: sortedOrders.length,
        original_order_preserved: true
      };
    }
    if (typeof res.data === "string" && res.data.includes("success")) {
      return {
        success: true,
        message: res.data,
        uploaded_count: sortedOrders.length,
        original_order_preserved: true
      };
    }

    return {
      success: true,
      message: "GRN orders processed by server",
      uploaded_count: sortedOrders.length,
      original_order_preserved: true
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
// PURCHASE RETURNS UPLOAD - otype = 'T'
// ============================================

export async function uploadPendingReturns(returns: any[]) {
  try {
    console.log("📤 Starting PURCHASE RETURNS upload of", returns.length, "returns");
    
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();
    
    const formattedReturns = returns.map((returnItem, index) => {
      const isManualEntry = returnItem.is_manual_entry === 1 || returnItem.is_manual_entry === '1' || returnItem.is_manual_entry === true;
      
      const formattedReturn: any = {
        supplier_code: returnItem.supplier_code,
        user_id: returnItem.userid,
        barcode: returnItem.barcode,
        quantity: returnItem.quantity,
        rate: returnItem.rate,
        mrp: returnItem.mrp,
        order_date: returnItem.return_date,
        created_at: returnItem.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'T',
        return_reason: returnItem.return_reason || '',
      };

     const isFullyManual = returnItem.is_manual_entry === 1 || returnItem.is_manual_entry === '1';
const isNewBarcodeExistingName = returnItem.is_manual_entry === 2 || returnItem.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedReturn.code = returnItem.itemcode;
  formattedReturn.item = returnItem.product_name || '';
  formattedReturn.ioflag = -101;
} else if (isFullyManual) {
  const hasBarcode = returnItem.barcode && returnItem.barcode !== '' && returnItem.barcode !== 'NULL';
  formattedReturn.code = hasBarcode ? returnItem.barcode : '';
  formattedReturn.barcode = hasBarcode ? returnItem.barcode : '';
  formattedReturn.item = returnItem.product_name || '';
  formattedReturn.itemdetails = returnItem.product_name || '';
  formattedReturn.text1 = returnItem.text1 || '';
  formattedReturn.ioflag = -100;
} else {
  formattedReturn.code = returnItem.itemcode;
  formattedReturn.barcode = returnItem.barcode || '';
  formattedReturn.item = '';
  formattedReturn.text1 = returnItem.text1 || '';
  formattedReturn.ioflag = 0;
}

      return formattedReturn;
    });

    const sortedReturns = sortChronologically(formattedReturns);

    console.log("📋 Returns Upload order verification:");
    sortedReturns.slice(0, 5).forEach((ret, idx) => {
    });

    console.log("🏷️ All entries have otype='T' for Purchase Returns");

    const res = await api.post("/upload-orders", { 
      orders: sortedReturns,
      total_orders: sortedReturns.length,
      transaction_type: 'PURCHASE_RETURN',
      upload_sequence: 'chronological'
    });

    console.log("✅ Purchase Return Upload response:", res.data);

    if (res.data) {
      if (res.data.success === true) {
        return {
          success: true,
          message: res.data.message || "Purchase returns uploaded successfully",
          uploaded_count: res.data.uploaded_count || sortedReturns.length,
          original_order_preserved: true
        };
      }
      
      if (res.data.status === "success") {
        return {
          success: true,
          message: res.data.message || "Purchase returns uploaded successfully",
          uploaded_count: sortedReturns.length,
          original_order_preserved: true
        };
      }
      
      if (typeof res.data === "string" && res.data.includes("success")) {
        return {
          success: true,
          message: res.data,
          uploaded_count: sortedReturns.length,
          original_order_preserved: true
        };
      }
    }

    console.warn("⚠️ Unexpected Purchase Return response format from server:", res.data);
    return {
      success: true,
      message: "Purchase returns processed by server",
      uploaded_count: sortedReturns.length,
      original_order_preserved: true
    };
    
  } catch (error: any) {
    console.error("❌ Purchase Return Upload error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid data format: " + (error.response.data?.message || "Check your data"));
    } else if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error. Please check your connection.");
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || "Purchase return upload failed");
    }
  }
}
// ============================================
// SALES UPLOAD - otype = 'S'
// ============================================

export async function uploadPendingSalesOrders(orders: any[]) {
  try {
    console.log("📤 Starting SALES upload of", orders.length, "orders");

    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();

    const formattedOrders = orders.map((order, index) => {
      const isManualEntry =
        order.is_manual_entry === 1 ||
        order.is_manual_entry === "1" ||
        order.is_manual_entry === true;

      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.is_manual_entry === 0 ? order.itemcode : order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.sale_date || order.order_date,
        created_at: order.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: "NT",
        otype: "S",
        customer: order.customer || '',
        enclosures: order.enclosures || '',
        description: order.description || '',
      };

     const isFullyManual = order.is_manual_entry === 1 || order.is_manual_entry === '1';
const isNewBarcodeExistingName = order.is_manual_entry === 2 || order.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -101;
} else if (isFullyManual) {
  formattedOrder.code = order.barcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -100;
} else {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = '';
  formattedOrder.ioflag = 0;
}
      return formattedOrder;
    });

    const sortedOrders = sortChronologically(formattedOrders);

    console.log("🏷️ All entries have otype='S' for Sales");

    const res = await api.post("/upload-orders", {
      orders: sortedOrders,
      total_orders: sortedOrders.length,
      transaction_type: "SALES",
      upload_sequence: "chronological",
    });

    console.log("✅ Sales Upload response:", res.data);

    if (res.data) {
      if (res.data.success === true) {
        return {
          success: true,
          message: res.data.message || "Sales orders uploaded successfully",
          uploaded_count: res.data.uploaded_count || sortedOrders.length,
        };
      }
      if (res.data.status === "success") {
        return {
          success: true,
          message: res.data.message || "Sales orders uploaded successfully",
          uploaded_count: sortedOrders.length,
        };
      }
      if (typeof res.data === "string" && res.data.includes("success")) {
        return { success: true, message: res.data, uploaded_count: sortedOrders.length };
      }
    }

    return {
      success: true,
      message: "Sales orders processed by server",
      uploaded_count: sortedOrders.length,
    };

  } catch (error: any) {
    console.error("❌ Sales Upload error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid data format: " + (error.response.data?.message || "Check your data"));
    } else if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error. Please check your connection.");
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || "Sales upload failed");
    }
  }
}

export async function uploadPendingSalesReturnOrders(orders: any[]) {
  try {
    console.log("📤 Starting SALES RETURN upload of", orders.length, "orders");

    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();

    const formattedOrders = orders.map((order, index) => {
      const isFullyManual = order.is_manual_entry === 1 || order.is_manual_entry === '1';
      const isNewBarcodeExistingName = order.is_manual_entry === 2 || order.is_manual_entry === '2';

      const formattedOrder: any = {
        supplier_code: order.supplier_code || '',
        user_id: order.userid,
        barcode: order.is_manual_entry === 0 ? order.itemcode : order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.sales_date || order.sale_date || new Date().toISOString().split('T')[0],
        created_at: order.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: "NT",
        otype: "SR",
      };

      if (isNewBarcodeExistingName) {
        formattedOrder.code = order.itemcode;
        formattedOrder.item = order.product_name || order.name || '';
        formattedOrder.ioflag = -101;
      } else if (isFullyManual) {
        formattedOrder.code = order.barcode;
        formattedOrder.item = order.product_name || order.name || '';
        formattedOrder.ioflag = -100;
      } else {
        formattedOrder.code = order.itemcode;
        formattedOrder.item = '';
        formattedOrder.ioflag = 0;
      }

      return formattedOrder;
    });

    const sortedOrders = sortChronologically(formattedOrders);

    const res = await api.post("/upload-orders", {
      orders: sortedOrders,
      total_orders: sortedOrders.length,
      transaction_type: "SALES_RETURN",
      upload_sequence: "chronological",
    });

    console.log("✅ Sales Return Upload response:", res.data);

    if (res.data) {
      if (res.data.success === true) {
        return {
          success: true,
          message: res.data.message || "Sales return orders uploaded successfully",
          uploaded_count: res.data.uploaded_count || sortedOrders.length,
        };
      }
      if (res.data.status === "success") {
        return {
          success: true,
          message: res.data.message || "Sales return orders uploaded successfully",
          uploaded_count: sortedOrders.length,
        };
      }
      if (typeof res.data === "string" && res.data.includes("success")) {
        return { success: true, message: res.data, uploaded_count: sortedOrders.length };
      }
    }

    return {
      success: true,
      message: "Sales return orders processed by server",
      uploaded_count: sortedOrders.length,
    };

  } catch (error: any) {
    console.error("❌ Sales Return Upload error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid data format: " + (error.response.data?.message || "Check your data"));
    } else if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error. Please check your connection.");
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || "Sales return upload failed");
    }
  }
}
// ============================================
// SEQUENTIAL UPLOAD FUNCTIONS
// ============================================

export async function uploadPendingOrdersSequentially(orders: any[]) {
  try {
    console.log("📤 Starting SEQUENTIAL upload of", orders.length, "orders");
    
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();
    
    // Format first, then sort
    const formattedOrders = orders.map((order, index) => {
      const isManualEntry = order.is_manual_entry === 1 || order.is_manual_entry === '1' || order.is_manual_entry === true;
      
      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.order_date,
        created_at: order.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'O',
      };

    const isFullyManual = order.is_manual_entry === 1 || order.is_manual_entry === '1';
const isNewBarcodeExistingName = order.is_manual_entry === 2 || order.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -101;
} else if (isFullyManual) {
  formattedOrder.code = order.barcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -100;
} else {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = '';
  formattedOrder.ioflag = 0;
}
      return formattedOrder;
    });

    const sortedOrders = sortChronologically(formattedOrders);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sortedOrders.length; i++) {
      const order = sortedOrders[i];
      
      console.log(`📤 Uploading order ${i + 1}/${sortedOrders.length}: ${order.item || order.code} (Created: ${order.created_at})`);

      try {
        const res = await api.post("/upload-orders", { 
          orders: [order],
          total_orders: 1,
          transaction_type: 'ORDER',
          upload_sequence: 'sequential',
          sequence_number: i + 1,
          total_sequences: sortedOrders.length
        });

        if (res.data?.success === true || res.data?.status === "success") {
          successCount++;
          results.push({ index: i, barcode: order.barcode, success: true, message: res.data?.message });
        } else {
          failCount++;
          results.push({ index: i, barcode: order.barcode, success: false, error: "Unexpected response" });
        }
      } catch (error: any) {
        failCount++;
        results.push({ index: i, barcode: order.barcode, success: false, error: error.message });
        console.error(`❌ Failed to upload order ${i + 1}:`, error.message);
      }
    }

    return {
      success: failCount === 0,
      message: `Uploaded ${successCount} of ${sortedOrders.length} orders sequentially`,
      uploaded_count: successCount,
      failed_count: failCount,
      results: results,
      original_order_preserved: true,
      upload_method: 'sequential'
    };
    
  } catch (error: any) {
    console.error("❌ Sequential upload error:", error.message);
    throw error;
  }
}

export async function uploadPendingGRNOrdersSequentially(orders: any[]) {
  try {
    console.log("📤 Starting SEQUENTIAL GRN upload of", orders.length, "orders");
    
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();
    
    const formattedOrders = orders.map((order, index) => {
      const isManualEntry = order.is_manual_entry === 1 || order.is_manual_entry === '1' || order.is_manual_entry === true;
      
      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.grn_date,
        created_at: order.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'D',
        description: order.description || '',

      };

     const isFullyManual = order.is_manual_entry === 1 || order.is_manual_entry === '1';
const isNewBarcodeExistingName = order.is_manual_entry === 2 || order.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -101;
} else if (isFullyManual) {
  formattedOrder.code = order.barcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -100;
} else {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = '';
  formattedOrder.ioflag = 0;
}
      return formattedOrder;
    });

    const sortedOrders = sortChronologically(formattedOrders);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sortedOrders.length; i++) {
      const order = sortedOrders[i];
      
      console.log(`📤 Uploading GRN order ${i + 1}/${sortedOrders.length}: ${order.item || order.code} (Created: ${order.created_at})`);

      try {
        const res = await api.post("/upload-orders", { 
          orders: [order],
          total_orders: 1,
          transaction_type: 'GRN',
          upload_sequence: 'sequential',
          sequence_number: i + 1,
          total_sequences: sortedOrders.length
        });

        if (res.data?.success === true || res.data?.status === "success") {
          successCount++;
          results.push({ index: i, barcode: order.barcode, success: true, message: res.data?.message });
        } else {
          failCount++;
          results.push({ index: i, barcode: order.barcode, success: false, error: "Unexpected response" });
        }
      } catch (error: any) {
        failCount++;
        results.push({ index: i, barcode: order.barcode, success: false, error: error.message });
        console.error(`❌ Failed to upload GRN order ${i + 1}:`, error.message);
      }
    }

    return {
      success: failCount === 0,
      message: `Uploaded ${successCount} of ${sortedOrders.length} GRN orders sequentially`,
      uploaded_count: successCount,
      failed_count: failCount,
      results: results,
      original_order_preserved: true,
      upload_method: 'sequential'
    };
    
  } catch (error: any) {
    console.error("❌ Sequential GRN upload error:", error.message);
    throw error;
  }
}

export async function uploadPendingReturnsSequentially(returns: any[]) {
  try {
    console.log("📤 Starting SEQUENTIAL PURCHASE RETURNS upload of", returns.length, "returns");
    
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();
    
    const formattedReturns = returns.map((returnItem, index) => {
      const isManualEntry = returnItem.is_manual_entry === 1 || returnItem.is_manual_entry === '1' || returnItem.is_manual_entry === true;
      
      const formattedReturn: any = {
        supplier_code: returnItem.supplier_code,
        user_id: returnItem.userid,
        barcode: returnItem.barcode,
        quantity: returnItem.quantity,
        rate: returnItem.rate,
        mrp: returnItem.mrp,
        order_date: returnItem.return_date,
        created_at: returnItem.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: 'NT',
        otype: 'T',
        return_reason: returnItem.return_reason || '',
      };

     const isFullyManual = returnItem.is_manual_entry === 1 || returnItem.is_manual_entry === '1';
const isNewBarcodeExistingName = returnItem.is_manual_entry === 2 || returnItem.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedReturn.code = returnItem.itemcode;
  formattedReturn.item = returnItem.product_name || '';
  formattedReturn.ioflag = -101;
} else if (isFullyManual) {
  const hasBarcode = returnItem.barcode && returnItem.barcode !== '' && returnItem.barcode !== 'NULL';
  formattedReturn.code = hasBarcode ? returnItem.barcode : '';
  formattedReturn.barcode = hasBarcode ? returnItem.barcode : '';
  formattedReturn.item = returnItem.product_name || '';
  formattedReturn.itemdetails = returnItem.product_name || '';
  formattedReturn.text1 = returnItem.text1 || '';
  formattedReturn.ioflag = -100;
} else {
  formattedReturn.code = returnItem.itemcode;
  formattedReturn.barcode = returnItem.barcode || '';
  formattedReturn.item = '';
  formattedReturn.ioflag = 0;
}

      return formattedReturn;
    });

    const sortedReturns = sortChronologically(formattedReturns);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sortedReturns.length; i++) {
      const returnItem = sortedReturns[i];
      
      console.log(`📤 Uploading return ${i + 1}/${sortedReturns.length}: ${returnItem.item || returnItem.code} (Created: ${returnItem.created_at})`);

      try {
        const res = await api.post("/upload-orders", { 
          orders: [returnItem],
          total_orders: 1,
          transaction_type: 'PURCHASE_RETURN',
          upload_sequence: 'sequential',
          sequence_number: i + 1,
          total_sequences: sortedReturns.length
        });

        if (res.data?.success === true || res.data?.status === "success") {
          successCount++;
          results.push({ index: i, barcode: returnItem.barcode, success: true, message: res.data?.message });
        } else {
          failCount++;
          results.push({ index: i, barcode: returnItem.barcode, success: false, error: "Unexpected response" });
        }
      } catch (error: any) {
        failCount++;
        results.push({ index: i, barcode: returnItem.barcode, success: false, error: error.message });
        console.error(`❌ Failed to upload return ${i + 1}:`, error.message);
      }
    }

    return {
      success: failCount === 0,
      message: `Uploaded ${successCount} of ${sortedReturns.length} purchase returns sequentially`,
      uploaded_count: successCount,
      failed_count: failCount,
      results: results,
      original_order_preserved: true,
      upload_method: 'sequential'
    };
    
  } catch (error: any) {
    console.error("❌ Sequential purchase return upload error:", error.message);
    throw error;
  }
}
export async function uploadPendingSalesOrdersSequentially(orders: any[]) {
  try {
    console.log("📤 Starting SEQUENTIAL SALES upload of", orders.length, "orders");

    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    const api = await createEnhancedAPI();

    const formattedOrders = orders.map((order, index) => {
      const isManualEntry =
        order.is_manual_entry === 1 ||
        order.is_manual_entry === "1" ||
        order.is_manual_entry === true;

      const formattedOrder: any = {
        supplier_code: order.supplier_code,
        user_id: order.userid,
        barcode: order.barcode,
        quantity: order.quantity,
        rate: order.rate,
        mrp: order.mrp,
        order_date: order.sale_date || order.order_date,
        created_at: order.created_at,
        original_index: index,
        discount: 0,
        pnfcharges: 0,
        exceiseduty: 0,
        salestax: 0,
        freightcharge: 0,
        othercharges: 0,
        cessoned: 0,
        cess: 0,
        taxcode: "NT",
        otype: "S",
        customer: order.customer || '',
        enclosures: order.enclosures || '',
        description: order.description || '',
      };

    const isFullyManual = order.is_manual_entry === 1 || order.is_manual_entry === '1';
const isNewBarcodeExistingName = order.is_manual_entry === 2 || order.is_manual_entry === '2';

if (isNewBarcodeExistingName) {
  formattedOrder.code = order.itemcode;
  formattedOrder.item = order.product_name || '';
  formattedOrder.ioflag = -101;
} else if (isFullyManual) {
  const hasBarcode = order.barcode && order.barcode !== '' && order.barcode !== 'NULL';
  formattedOrder.code = hasBarcode ? order.barcode : '';
  formattedOrder.barcode = hasBarcode ? order.barcode : '';
  formattedOrder.item = order.product_name || '';
  formattedOrder.itemdetails = order.product_name || '';
  formattedOrder.text1 = order.text1 || '';
  formattedOrder.ioflag = -100;
} else {
   formattedOrder.code = order.itemcode;
  formattedOrder.barcode = order.barcode || '';
  formattedOrder.item = '';
  formattedOrder.ioflag = 0;
}
      return formattedOrder;
    });

    const sortedOrders = sortChronologically(formattedOrders);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sortedOrders.length; i++) {
      const order = sortedOrders[i];
      console.log(`📤 Uploading sales order ${i + 1}/${sortedOrders.length}: ${order.item || order.code} (Created: ${order.created_at})`);

      try {
        const res = await api.post("/upload-orders", {
          orders: [order],
          total_orders: 1,
          transaction_type: "SALES",
          upload_sequence: "sequential",
          sequence_number: i + 1,
          total_sequences: sortedOrders.length,
        });

        if (res.data?.success === true || res.data?.status === "success") {
          successCount++;
          results.push({ index: i, barcode: order.barcode, success: true, message: res.data?.message });
        } else {
          failCount++;
          results.push({ index: i, barcode: order.barcode, success: false, error: "Unexpected response" });
        }
      } catch (error: any) {
        failCount++;
        results.push({ index: i, barcode: order.barcode, success: false, error: error.message });
        console.error(`❌ Failed to upload sales order ${i + 1}:`, error.message);
      }
    }

    return {
      success: failCount === 0,
      message: `Uploaded ${successCount} of ${sortedOrders.length} sales orders sequentially`,
      uploaded_count: successCount,
      failed_count: failCount,
      results: results,
      original_order_preserved: true,
      upload_method: "sequential",
    };
  } catch (error: any) {
    console.error("❌ Sequential sales upload error:", error.message);
    throw error;
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
    
    const testData = {
      orders: [{
        supplier_code: "TEST",
        user_id: "test_user",
        barcode: "TEST123",
        quantity: 1,
        rate: 10,
        mrp: 12,
        order_date: new Date().toISOString().split("T")[0],
        otype: 'O',
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