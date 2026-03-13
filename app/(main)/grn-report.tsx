import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getAllSuppliers } from "../../utils/database";

const db = SQLite.openDatabaseSync("magicpedia.db");

interface GRNReportData {
  id: string;
  supplier_code: string;
  supplier_name: string;
  date: string;
  time: string;
  items: {
    id: number;
    product_name: string;
    barcode: string;
    quantity: number;
    rate: number;
    mrp: number;
    total: number;
    is_manual_entry: number;
  }[];
  grossValue: number;
  totalQuantity: number;
}

type TabType = 'pending' | 'uploaded';

// Utility function to convert UTC to IST
const convertUTCtoIST = (utcDateString: string): Date => {
  const utcDate = new Date(utcDateString);
  // Convert UTC to IST (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(utcDate.getTime() + istOffset);
  return istDate;
};

// Initialize permanent GRN reports table
const initGRNReportsTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grn_reports_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT NOT NULL,
        barcode TEXT NOT NULL,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        rate REAL NOT NULL,
        mrp REAL NOT NULL,
        grn_date TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        is_manual_entry INTEGER DEFAULT 0
      );
    `);
    console.log("✅ GRN reports history table initialized");
  } catch (error) {
    console.error("❌ Error initializing GRN reports table:", error);
  }
};

// Copy synced GRN data to permanent reports table
const copyToReportsHistory = async () => {
  try {
    const syncedData = await db.getAllAsync(
      `SELECT DISTINCT
        supplier_code,
        barcode,
        product_name,
        quantity,
        rate,
        mrp,
        grn_date,
        created_at
       FROM grn_to_sync 
       WHERE sync_status = 'synced'`
    ) as any[];

    console.log(`📋 Found ${syncedData.length} synced GRN records to archive`);

    for (const record of syncedData) {
      const exists = await db.getFirstAsync(
        `SELECT id FROM grn_reports_history 
         WHERE supplier_code = ? 
         AND barcode = ? 
         AND grn_date = ?
         AND uploaded_at = ?`,
        [record.supplier_code, record.barcode, record.grn_date, record.created_at]
      );

      if (!exists) {
        await db.runAsync(
          `INSERT INTO grn_reports_history 
           (supplier_code, barcode, product_name, quantity, rate, mrp, grn_date, uploaded_at, is_manual_entry)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.supplier_code,
            record.barcode,
            record.product_name,
            record.quantity,
            record.rate,
            record.mrp,
            record.grn_date,
            record.created_at,
            record.is_manual_entry || 0
          ]
        );
      }
    }

    console.log("✅ Synced data copied to reports history");
  } catch (error) {
    console.error("❌ Error copying to reports history:", error);
  }
};

export default function GRNReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<GRNReportData[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [cardTapCounts, setCardTapCounts] = useState<{ [key: string]: number }>({});

  
  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editRate, setEditRate] = useState(0);
  const [editMrp, setEditMrp] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      await initGRNReportsTable();
      await copyToReportsHistory();
      await loadReports();
    };
    initialize();
  }, []);

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      console.log(`📚 Loading GRN reports for tab: ${activeTab}...`);

      let rows: any[] = [];

      if (activeTab === 'uploaded') {
        // Load from grn_reports_history (uploaded items)
        rows = await db.getAllAsync(
          `SELECT 
            id,
            supplier_code,
            grn_date,
            uploaded_at as created_at,
            product_name,
            barcode,
            quantity,
            rate,
            mrp,
            is_manual_entry
           FROM grn_reports_history 
           WHERE grn_date >= ?
           ORDER BY uploaded_at DESC, supplier_code`,
          [threeDaysAgoStr]
        ) as any[];
      } else {
        // Load from grn_to_sync (pending items in cart)
        rows = await db.getAllAsync(
          `SELECT 
            id,
            supplier_code,
            grn_date,
            created_at,
            product_name,
            barcode,
            quantity,
            rate,
            mrp,
            is_manual_entry
           FROM grn_to_sync 
           WHERE sync_status = 'pending'
           AND grn_date >= ?
           ORDER BY created_at DESC, supplier_code`,
          [threeDaysAgoStr]
        ) as any[];
      }

      console.log(`📊 Total rows from ${activeTab} table:`, rows.length);

      const allSuppliers = await getAllSuppliers();
      console.log("📋 Suppliers loaded:", allSuppliers?.length || 0);
      
      const supplierMap: { [key: string]: string } = {};
      if (Array.isArray(allSuppliers)) {
        allSuppliers.forEach((supplier: any) => {
          if (supplier.code && supplier.name) {
            supplierMap[supplier.code] = supplier.name;
          }
        });
      }

      const groupedData: { [key: string]: GRNReportData } = {};

      for (const row of rows) {
        // Convert UTC to IST for display
        const istDate = convertUTCtoIST(row.created_at);
        const batchKey = Math.floor(istDate.getTime() / (5 * 60 * 1000));
        
        const dateKey = istDate.toISOString().split('T')[0];
        const key = `${row.supplier_code}_${dateKey}_${batchKey}`;
        
        if (!groupedData[key]) {
          const supplierName = supplierMap[row.supplier_code] || row.supplier_code;
          
          console.log(`🏢 Creating card for supplier: ${row.supplier_code} (${supplierName}) at ${istDate.toLocaleTimeString()}`);
          
          groupedData[key] = {
            id: key,
            supplier_code: row.supplier_code,
            supplier_name: supplierName,
            date: istDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }),
            time: istDate.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            items: [],
            grossValue: 0,
            totalQuantity: 0,
          };
        }

        const quantity = Number(row.quantity) || 0;
        const rate = Number(row.rate) || 0;
        const mrp = Number(row.mrp) || 0;
        const itemTotal = quantity * rate;

        groupedData[key].items.push({
          id: row.id,
          product_name: row.product_name || 'Unknown Product',
          barcode: row.barcode,
          quantity: quantity,
          rate: rate,
          mrp: mrp,
          total: itemTotal,
          is_manual_entry: row.is_manual_entry || 0,
        });
        
        groupedData[key].grossValue += itemTotal;
        groupedData[key].totalQuantity += quantity;
      }

      const reportsArray = Object.values(groupedData);
      
      // Sort by newest first (descending order)
      reportsArray.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time).getTime();
        const dateB = new Date(b.date + ' ' + b.time).getTime();
        return dateB - dateA;
      });
      
      console.log("📈 Total Report Cards:", reportsArray.length);
      reportsArray.forEach((report, idx) => {
        console.log(`  Card ${idx + 1}: ${report.supplier_name} (${report.supplier_code}) - ${report.items.length} items - ₹${report.grossValue.toFixed(2)}`);
      });

      setReports(reportsArray);
    } catch (error) {
      console.error("❌ Error loading GRN reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReport = (key: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  const handleCardHeaderTap = (report: GRNReportData) => {
    if (activeTab !== 'uploaded') return;
    setCardTapCounts(prev => {
      const current = (prev[report.id] || 0) + 1;
      if (current >= 5) {
        Alert.alert(
          "Re-upload GRN?",
          `Do you want to re-upload the GRN for "${report.supplier_name}"?\n\nUse this if the uploaded data appears broken or missing.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => {} },
            {
              text: "Re-upload",
              style: "default",
              onPress: async () => {
                try {
                  // Copy history records back to grn_to_sync as pending
                  const historyItems = await db.getAllAsync(
                    `SELECT * FROM grn_reports_history 
                     WHERE supplier_code = ? AND grn_date = ?`,
                    [report.supplier_code, report.items[0] ? report.date : '']
                  ) as any[];

                  // Use the raw grn_date from DB by querying with supplier_code and uploaded_at range
                  const uploadedAtDate = report.date; // display date
                  const reRecords = await db.getAllAsync(
                    `SELECT * FROM grn_reports_history WHERE supplier_code = ?`,
                    [report.supplier_code]
                  ) as any[];

                  // Filter to only records matching this card's items by barcode
                  const barcodes = report.items.map(i => i.barcode);
                  const matchedRecords = reRecords.filter(r => barcodes.includes(r.barcode));

                  // Fetch userid from an existing grn_to_sync record (or grn_reports_history if available)
                  const existingRecord = await db.getFirstAsync(
                    `SELECT userid FROM grn_to_sync WHERE userid IS NOT NULL LIMIT 1`
                  ) as any;
                  const userid = existingRecord?.userid || '';

                  for (const rec of matchedRecords) {
                    await db.runAsync(
                      `INSERT INTO grn_to_sync 
                       (supplier_code, barcode, product_name, quantity, rate, mrp, grn_date, sync_status, is_manual_entry, created_at, userid)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), ?)`,
                      [rec.supplier_code, rec.barcode, rec.product_name, rec.quantity, rec.rate, rec.mrp, rec.grn_date, rec.is_manual_entry || 0, userid]
                    );
                  }

                  Alert.alert("Done", `${matchedRecords.length} item(s) moved back to pending. Go to Upload GRN to re-upload.`);
                } catch (err: any) {
                  Alert.alert("Error", err.message || "Failed to re-queue items.");
                }
              }
            }
          ]
        );
        return { ...prev, [report.id]: 0 };
      }
      return { ...prev, [report.id]: current };
    });
  };

  const handleBack = () => {
    router.back();
  };

  const getTotalGrossValue = () => {
    return reports.reduce((acc, report) => acc + (report.grossValue || 0), 0);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setExpandedReports(new Set()); // Clear expanded reports when switching tabs
  };

  // Edit Item Functions
  const openEditModal = (item: any) => {
    console.log("Opening edit modal for item:", item);
    setEditingItem(item);
    setEditQuantity(item.quantity || 1);
    setEditRate(item.rate || item.cost || 0);
    setEditMrp(item.mrp || item.bmrp || 0);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditQuantity(1);
    setEditRate(0);
    setEditMrp(0);
  };

  const handleIncreaseQuantity = () => {
    setEditQuantity(prev => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    if (editQuantity > 1) {
      setEditQuantity(prev => prev - 1);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const newTotal = editQuantity * editRate;
      
      console.log("Saving edit with:", {
        id: editingItem.id,
        quantity: editQuantity,
        rate: editRate,
        mrp: editMrp,
        total: newTotal
      });

      // Update the pending GRN item in grn_to_sync table
      await db.runAsync(
        `UPDATE grn_to_sync 
         SET quantity = ?, rate = ?, mrp = ? 
         WHERE id = ?`,
        [editQuantity, editRate, editMrp, editingItem.id]
      );
      
      // Update local state
      setReports(prevReports => {
        return prevReports.map(report => {
          const updatedItems = report.items.map(item => {
            if (item.id === editingItem.id) {
              const updatedItem = {
                ...item,
                quantity: editQuantity,
                rate: editRate,
                mrp: editMrp,
                total: newTotal
              };
              console.log("Updated item in state:", updatedItem);
              return updatedItem;
            }
            return item;
          });

          // Recalculate report totals
          const grossValue = updatedItems.reduce((sum, item) => sum + item.total, 0);
          const totalQuantity = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

          console.log("Recalculated totals:", { grossValue, totalQuantity });

          return {
            ...report,
            items: updatedItems,
            grossValue,
            totalQuantity
          };
        });
      });

      Alert.alert("Success", "Item updated successfully!");
      closeEditModal();
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert("Error", "Failed to update item");
    }
  };

  // Delete Item Function
  const handleDeleteItem = (itemId: number) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item? This will move it to uploaded history.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Get the item details before deleting
              const item = await db.getFirstAsync(
                `SELECT * FROM grn_to_sync WHERE id = ?`,
                [itemId]
              ) as any;

              if (item) {
                // Save to grn_reports_history first
                await db.runAsync(
                  `INSERT INTO grn_reports_history 
                   (supplier_code, barcode, product_name, quantity, rate, mrp, grn_date, uploaded_at, is_manual_entry)
                   VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
                  [
                    item.supplier_code,
                    item.barcode,
                    item.product_name,
                    item.quantity,
                    item.rate,
                    item.mrp,
                    item.grn_date,
                    item.is_manual_entry || 0
                  ]
                );

                // Delete from grn_to_sync
                await db.runAsync(
                  `DELETE FROM grn_to_sync WHERE id = ?`,
                  [itemId]
                );

                // Update local state
                setReports(prevReports => {
                  const updatedReports = prevReports.map(report => {
                    const filteredItems = report.items.filter(item => item.id !== itemId);
                    
                    if (filteredItems.length === 0) {
                      // If no items left in this report, filter out the entire report
                      return null;
                    }

                    // Recalculate totals
                    const grossValue = filteredItems.reduce((sum, item) => sum + item.total, 0);
                    const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);

                    return {
                      ...report,
                      items: filteredItems,
                      grossValue,
                      totalQuantity
                    };
                  }).filter(report => report !== null) as GRNReportData[];

                  return updatedReports;
                });

                Alert.alert("Success", "Item deleted and moved to uploaded history");
              }
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GRN Reports</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#681270" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>GRN Reports</Text>
          <Text style={styles.headerSubtitle}>Last 3 days {reports.length} reports</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {editingItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Item</Text>
                  <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseButton}>
                    <Ionicons name="close-circle" size={28} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.productName} numberOfLines={2}>
                  {editingItem.product_name}
                </Text>
                <Text style={styles.productBarcode}>Barcode: {editingItem.barcode}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Quantity</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={handleDecreaseQuantity}
                    >
                      <Ionicons name="remove" size={24} color="#ec4899" />
                    </TouchableOpacity>
                    
                    <TextInput
                      style={styles.quantityInput}
                      value={editQuantity.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        setEditQuantity(num > 0 ? num : 1);
                      }}
                      keyboardType="number-pad"
                      textAlign="center"
                    />
                    
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={handleIncreaseQuantity}
                    >
                      <Ionicons name="add" size={24} color="#ec4899" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Rate (Cost) (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editRate.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      setEditRate(num);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>MRP (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editMrp.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      setEditMrp(num);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>

                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total Value:</Text>
                  <Text style={styles.totalValue}>₹{(editQuantity * editRate).toFixed(2)}</Text>
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeEditModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Toggle Tabs - Pending First */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            styles.tabLeft,
            activeTab === 'pending' && styles.tabActive
          ]}
          onPress={() => handleTabChange('pending')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="cart-outline" 
            size={18} 
            color={activeTab === 'pending' ? '#FFFFFF' : '#6B7280'} 
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'pending' && styles.tabTextActive
          ]}>
            Pending
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            styles.tabRight,
            activeTab === 'uploaded' && styles.tabActive
          ]}
          onPress={() => handleTabChange('uploaded')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="cloud-done-outline" 
            size={18} 
            color={activeTab === 'uploaded' ? '#FFFFFF' : '#6B7280'} 
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'uploaded' && styles.tabTextActive
          ]}>
            Uploaded
          </Text>
        </TouchableOpacity>
      </View>

      {reports.length > 0 && (
        <View style={styles.totalCard}>
          <View style={styles.totalIconContainer}>
            <Ionicons name="wallet" size={28} color="#059669" />
          </View>
          <View style={styles.totalTextContainer}>
            <Text style={styles.totalLabel}>
              {activeTab === 'pending' ? 'Total Pending Value' : 'Total Uploaded Value'}
            </Text>
            <Text style={styles.totalValue}>
              {getTotalGrossValue().toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons 
                name={activeTab === 'pending' ? "cart-outline" : "cloud-upload-outline"} 
                size={48} 
                color="#9CA3AF" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'No Pending Items' : 'No Uploaded Reports'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' 
                ? 'No GRN items are waiting to be uploaded. Add items from GRN Entry.'
                : 'No GRN data has been uploaded in the last 3 days'}
            </Text>
          </View>
        ) : (
          reports.map((report) => {
            const isExpanded = expandedReports.has(report.id);

            return (
              <View key={report.id} style={styles.reportCard}>
                {/* Compact Supplier Header */}
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => handleCardHeaderTap(report)}
                  style={styles.supplierSection}
                >
                <View style={styles.supplierSection}>
                  <View style={styles.supplierHeader}>
                    <View style={styles.supplierIconBg}>
                      <Ionicons name="business" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.supplierInfo}>
                      <Text style={styles.supplierName} numberOfLines={1}>
                        {report.supplier_name}
                      </Text>
                      <View style={styles.dateTimeRow}>
                        <View style={styles.dateTimeItem}>
                          <Ionicons name="calendar" size={11} color="#fa48fa" />
                          <Text style={styles.dateTimeText}>{report.date}</Text>
                        </View>
                        <View style={styles.dateDivider} />
                        <View style={styles.dateTimeItem}>
                          <Ionicons name="time" size={11} color="#fa48fa" />
                          <Text style={styles.dateTimeText}>{report.time}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                </TouchableOpacity>

                {/* Compact Stats Section */}
                <View style={styles.statsSection}>
                  <View style={styles.statItem}>
                    <View style={styles.statHeader}>
                      <Ionicons name="cash" size={15} color="#162bea" />
                      <Text style={styles.statLabel}>Value</Text>
                    </View>
                    <Text style={[styles.statValue, styles.grossValue]}>
                      {report.grossValue.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={styles.statHeader}>
                      <Ionicons name="cube" size={16} color="#e71c66" />
                      <Text style={styles.statLabel}>Qty</Text>
                    </View>
                    <Text style={[styles.statValue, styles.quantityValue]}>
                      {report.totalQuantity}
                    </Text>
                  </View>
                </View>

                {/* Dropdown Button */}
                <TouchableOpacity
                  onPress={() => toggleReport(report.id)}
                  style={styles.dropdownButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownText}>
                    {isExpanded ? 'Hide' : 'View'} Items ({report.items.length})
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#6366F1"
                  />
                </TouchableOpacity>

                {/* Items List (Expanded) - Compact Layout with Edit/Delete buttons for pending */}
                {isExpanded && (
                  <View style={styles.itemsSection}>
                    {report.items.map((item, idx) => (
                      <View key={`${item.barcode}_${idx}`} style={styles.itemRow}>
                        <View style={styles.itemColorBar} />
                        <View style={styles.itemContent}>
                          {/* Line 1: Item Name + Manual Badge + Action Buttons */}
                          <View style={styles.itemHeaderRow}>
                            <View style={styles.itemNameContainer}>
                              <Text style={styles.itemName} numberOfLines={1}>
                                {item.product_name}
                              </Text>
                              {item.is_manual_entry === 1 && (
                                <View style={styles.manualBadge}>
                                  <Text style={styles.manualBadgeText}>M</Text>
                                </View>
                              )}
                            </View>
                            
                            {/* Edit and Delete buttons - only show for pending tab */}
                            {activeTab === 'pending' && (
                              <View style={styles.itemActions}>
                                <TouchableOpacity 
                                  onPress={() => openEditModal(item)}
                                  style={styles.editButton}
                                >
                                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  onPress={() => handleDeleteItem(item.id)}
                                  style={styles.deleteButton}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                          
                          {/* Line 2: Barcode */}
                          <Text style={styles.itemBarcode}>{item.barcode}</Text>
                          
                          {/* Line 3: MRP */}
                          <Text style={styles.itemMrp}>MRP: ₹{item.mrp.toFixed(2)}</Text>
                          
                          {/* Line 4: Qty, Cost, and Total */}
                          <View style={styles.itemDetailsRow}>
                            <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                            <Text style={styles.itemRate}>Cost: ₹{item.rate.toFixed(2)}</Text>
                            <Text style={styles.itemTotal}>= ₹{item.total.toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f8a6",
  },
  header: {
    backgroundColor: "#ae2d97",
    paddingTop: Platform.OS === "android" ? 40 : 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgb(255, 255, 255)",
    marginTop: 1,
  },
  headerSpacer: {
    width: 34,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  tabLeft: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  tabRight: {
    // No additional styles needed
  },
  tabActive: {
    backgroundColor: '#ae2d97',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#6B7280",
  },
  totalCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 14,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#083929",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  totalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d3f6e4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  totalTextContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#047857",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 16,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#edeef1",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#374151",
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  reportCard: {
    backgroundColor: "#ffffffe7",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#101010",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.38,
    shadowRadius: 9,
    elevation: 2,
    borderWidth: 2,
    borderColor: "#bdbdbe81",
  },
  supplierSection: {
    backgroundColor: "#f5ecfa",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f6b1ca",
  },
  supplierHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  supplierIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ce092d",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#a80c3d",
    marginBottom: 3,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dateDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#b61174",
  },
  dateTimeText: {
    fontSize: 13,
    color: "#a90dac",
    fontWeight: "500",
  },
  statsSection: {
    flexDirection: "row",
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#fe8df5",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  grossValue: {
    color: "#1a27d1",
  },
  quantityValue: {
    color: "#ab136c",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e6c7ce2a",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c92f8955",
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#170c52",
  },
  itemsSection: {
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemColorBar: {
    width: 3,
    backgroundColor: "#10B981",
  },
  itemContent: {
    flex: 1,
    padding: 8,
  },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 4,
  },
  itemNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    lineHeight: 18,
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  manualBadge: {
    backgroundColor: "#3B82F6",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  manualBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  itemBarcode: {
    fontSize: 11,
    color: "#9d8a9b",
    marginBottom: 2,
  },
  itemMrp: {
    fontSize: 11,
    color: "#3448e2",
    fontWeight: "900",
    marginBottom: 4,
  },
  itemDetailsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: 'wrap',
  },
  itemQty: {
    fontSize: 11,
    color: "#ff7373",
    fontWeight: "900",
  },
  itemRate: {
    fontSize: 11,
    color: "#ff7373",
    fontWeight: "900",
  },
  itemTotal: {
    fontSize: 11,
    color: "#1e9532",
    fontWeight: "900",
  },

  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
    textAlign: "center",
  },
  productBarcode: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fce7f3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ec4899",
  },
  quantityInput: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    minWidth: 60,
    textAlign: "center",
    padding: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
  },
  textInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ec4899",
  },
  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  saveButton: {
    backgroundColor: "#ec4899",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});