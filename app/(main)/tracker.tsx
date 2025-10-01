import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface ProductData {
  code: string;
  name: string;
  catagory: string;
  product: string;
  brand: string;
  unit: string;
  taxcode: string;
  productcode: string;
  barcode: string;
  quantity: number;
  cost: number;
  bmrp: number;
  salesprice: number;
  secondprice: number;
  thirdprice: number;
  supplier: string;
  expirydate: string | null;
}

export default function StockTrackerScreen() {
  const router = useRouter();
  const [barcode, setBarcode] = useState('');
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  // Get the paired IP on component mount
  useEffect(() => {
    loadPairedIP();
  }, []);

  const loadPairedIP = async () => {
    try {
      const ip = await SecureStore.getItemAsync("paired_ip");
      if (ip) {
        setApiBaseUrl(`http://${ip}:8000`);
        console.log('Loaded paired IP:', ip);
      } else {
        console.log('No paired IP found');
        Alert.alert(
          'Server Not Connected',
          'Please connect to a server first from the settings screen.'
        );
      }
    } catch (error) {
      console.error('Error loading paired IP:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleBarcodeSearch = async () => {
    if (!barcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    if (!apiBaseUrl) {
      Alert.alert(
        'Server Not Connected',
        'Please connect to a server first from the settings screen.'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to fetch from:', `${apiBaseUrl}/product-details`);
      
      const response = await fetch(`${apiBaseUrl}/product-details`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Find product by barcode or product code
      const foundProduct = data.find((product: ProductData) => 
        product.barcode.includes(barcode) || 
        product.productcode === barcode ||
        product.code === barcode
      );
      
      if (foundProduct) {
        setProductData(foundProduct);
      } else {
        Alert.alert('Not Found', 'No product found with this barcode');
        setProductData(null);
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      Alert.alert(
        'Connection Error', 
        'Failed to fetch product details. Please check:\n\n' +
        '1. Your API server is running\n' +
        '2. Network connection is active\n' +
        '3. Server IP is correctly configured\n\n' +
        `Current API: ${apiBaseUrl}\n\n` +
        `Error: ${error.message || 'Unknown error'}`
      );
      setProductData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setBarcode('');
    setProductData(null);
  };

  const handleScanBarcode = () => {
    Alert.alert('Scanner', 'Camera scanner would open here');
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STOCK TRACKER</Text>
        <TouchableOpacity onPress={handleScanBarcode} style={styles.searchButton}>
          <Ionicons name="search" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Server Status */}
      {!apiBaseUrl && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Not connected to server. Please pair with a server first.
          </Text>
        </View>
      )}

      {/* Barcode Input */}
      <View style={styles.barcodeSection}>
        <TextInput
          style={styles.barcodeInput}
          placeholder="Enter barcode, product code, or item code"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="default"
          returnKeyType="search"
          onSubmitEditing={handleBarcodeSearch}
          editable={!loading && !!apiBaseUrl}
          placeholderTextColor={apiBaseUrl ? '#666' : '#999'}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.itemDetailsButton, !apiBaseUrl && styles.disabledButton]}
          onPress={handleBarcodeSearch}
          disabled={loading || !apiBaseUrl}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {apiBaseUrl ? 'Search Product' : 'Connect Server First'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleClearAll} 
          style={styles.clearButton}
          disabled={loading}
        >
          <Text style={styles.clearButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Item Details Section */}
        {productData && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Item Details</Text>
            </View>
            <View style={styles.detailsContainer}>
              <DetailRow label="Item Name :" value={productData.name} />
              <DetailRow label="Item Code :" value={productData.code} />
              <DetailRow label="Category :" value={productData.catagory} />
              <DetailRow label="Product :" value={productData.product} />
              <DetailRow label="Brand :" value={productData.brand} />
              <DetailRow label="Unit :" value={productData.unit} />
              <DetailRow label="GST :" value={`${productData.taxcode}%`} />
            </View>
          </View>
        )}

        {/* Barcode Details Section */}
        {productData && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Barcode Details</Text>
              <Text style={styles.liveData}>Live Data</Text>
            </View>
            <View style={styles.detailsContainer}>
              <DetailRow label="Barcode :" value={productData.barcode} />
              <DetailRow label="Product Code :" value={productData.productcode} />
              <DetailRow label="Stock Available :" value={`${productData.quantity}`} />
              <DetailRow label="Cost :" value={`₹${productData.cost.toFixed(2)}`} isHighlighted />
              <DetailRow label="MRP :" value={`₹${productData.bmrp.toFixed(2)}`} isHighlighted />
              <DetailRow label="Sales Price :" value={`₹${productData.salesprice.toFixed(2)}`} isHighlighted />
              <DetailRow label="Second Price :" value={`₹${productData.secondprice.toFixed(2)}`} />
              <DetailRow label="Third Price :" value={`₹${productData.thirdprice.toFixed(2)}`} />
              <DetailRow label="Supplier :" value={productData.supplier} />
              <DetailRow label="Expiry :" value={productData.expirydate || 'N/A'} />
            </View>
          </View>
        )}

        {/* Empty State */}
        {!productData && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {apiBaseUrl 
                ? 'Enter barcode to view product details' 
                : 'Please connect to a server first to search products'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const DetailRow = ({ label, value, isHighlighted = false }: { 
  label: string; 
  value: string; 
  isHighlighted?: boolean 
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, isHighlighted && styles.highlightedValue]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 45 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D7A',
    textAlign: 'center',
    flex: 1,
  },
  searchButton: {
    padding: 8,
  },

  warningBanner: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },

  barcodeSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  barcodeInput: {
    borderWidth: 2,
    borderColor: '#FFB74D',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },

  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  itemDetailsButton: {
    flex: 1,
    backgroundColor: '#2E7D7A',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FFB74D',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  scrollView: {
    flex: 1,
    marginTop: 16,
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  sectionHeader: {
    backgroundColor: '#2E7D7A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  liveData: {
    color: '#FFB74D',
    fontSize: 14,
    fontWeight: '600',
  },

  detailsContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  highlightedValue: {
    color: '#FF9800',
    fontWeight: '600',
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});


// dj