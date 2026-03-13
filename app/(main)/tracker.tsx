// app/tracker.tsx - COMPLETE FIXED VERSION WITH ENHANCED PRICE DISPLAY
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const db = SQLite.openDatabaseSync("magicpedia.db");

interface PriceData {
  price_code: string;
  price_name: string;
  value: string;
}
interface GodownStock {
  goddownid: string;   // e.g. "VN", "BR1"
  product: string;
  barcode: string;
  quantity: number;
}

interface ProductData {
  code: string;
  name: string;
  catagory: string;
  category: string;
  product: string;
  brand: string;
  unit: string;
  taxcode: string;
  productcode: string;
  barcode: string;
  quantity: number;
  supplier: string | null;
  expirydate: string | null;
  prices: PriceData[];
  cost?: number;
  bmrp?: number;
  CO?: number;
  MR?: number;
  S1?: number;
  S2?: number;
  batch_supplier?: string;
  goddown_stock: GodownStock[];

}

export default function StockTrackerScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const [suggestions, setSuggestions] = useState<ProductData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMode, setSearchMode] = useState<'barcode' | 'name'>('barcode');
  const [dataSource] = useState<'api' | 'database'>('database');
  const [isInitialized, setIsInitialized] = useState(false);
  const [godownList, setGodownList] = useState<{goddownid: string, name: string}[]>([]);
  const [godownLoading, setGodownLoading] = useState(false);
  const [apiProductsCache, setApiProductsCache] = useState<any[]>([]); 
  const inputRef = useRef<TextInput>(null);
  const [hardwareScanValue, setHardwareScanValue] = useState('');

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<"hardware" | "camera">("hardware");
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);
  const hardwareScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // 🔥 FIX: Copy data from category to catagory if needed
  useEffect(() => {
    const fixDatabaseColumns = async () => {
      try {
        // Check if catagory column is empty
        const result = await db.getFirstAsync(
          "SELECT COUNT(*) as count FROM product_data WHERE catagory IS NULL OR catagory = ''"
        ) as { count: number };
        
        if (result.count > 0) {
          console.log(`🔧 Fixing ${result.count} products: copying category → catagory`);
          await db.runAsync('UPDATE product_data SET catagory = category WHERE catagory IS NULL OR catagory = ""');
          console.log("✅ Database fix complete!");
        }
      } catch (error) {
        console.error("❌ Fix failed:", error);
      }
    };
    
    fixDatabaseColumns();
  }, []);
useEffect(() => {
  const fetchInitialData = async () => {
    try {
      const { createEnhancedAPI } = await import('@/utils/api');
      const api = await createEnhancedAPI();

      // Fetch both in parallel
      const [godownRes, productsRes] = await Promise.all([
        api.get('/acc-goddown'),
        api.get('/product-details', { timeout: 30000 })
      ]);

      if (Array.isArray(godownRes.data?.data)) {
        setGodownList(godownRes.data.data);
        console.log('✅ Godown list loaded:', godownRes.data.data.length);
      }

      if (Array.isArray(productsRes.data?.data)) {
        setApiProductsCache(productsRes.data.data);
        console.log('✅ API products cached:', productsRes.data.data.length);
      }
    } catch (e) {
      console.log('⚠️ Could not fetch initial data:', e);
    }
  };
  fetchInitialData();
}, []); // ← runs ONCE only
  useEffect(() => {
    const loadScanMode = async () => {
      const saved = await SecureStore.getItemAsync("scanMode");
      if (saved === "camera" || saved === "hardware") {
        setScanMode(saved);
      }
    };
    loadScanMode();
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      initializeDatabase();
    }
  }, [isInitialized]);

  useEffect(() => {
    if (!showScanner) {
      setTimeout(() => {
        setScanned(false);
        scanLockRef.current = false;
      }, 300);
    }
  }, [showScanner]);

  useEffect(() => {
    return () => {
      if (hardwareScanTimeoutRef.current) {
        clearTimeout(hardwareScanTimeoutRef.current);
      }
    };
  }, []);

  // ADD THIS USEEFFECT after line 132
useEffect(() => {
  if (hardwareScanValue && hardwareScanValue.trim()) {
    const trimmed = hardwareScanValue.trim();
    console.log(`📟 Hardware scan detected: "${trimmed}"`);
    setHardwareScanValue('');
    
    // Process hardware scan immediately
    searchBarcodeWithVariants(trimmed).then(foundProducts => {
      if (foundProducts.length === 1) {
        displayProduct(foundProducts[0]);
      } else if (foundProducts.length > 1) {
        setSuggestions(foundProducts);
        setShowSuggestions(true);
        setProductData(null);
      } else {
        Alert.alert('Not Found', `No product found for barcode: ${trimmed}`);
        setProductData(null);
      }
    });
  }
}, [hardwareScanValue]);

// ADD THIS USEEFFECT after the hardware scan useEffect
useEffect(() => {
  if (searchMode === 'barcode' && !showScanner) {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [searchMode, showScanner]);

useEffect(() => {
  SecureStore.getItemAsync("user_role").then(role => setUserRole(role));
}, []);

useEffect(() => {
    const fetchInitialData = async () => {
      const { createEnhancedAPI } = await import('@/utils/api');
      const api = await createEnhancedAPI();

      // Fetch godown list separately
      try {
        const godownRes = await api.get('/acc-goddown');
        if (Array.isArray(godownRes.data?.data)) {
          setGodownList(godownRes.data.data);
          console.log('✅ Godown list loaded:', godownRes.data.data.length);
        }
      } catch (e) {
        console.log('⚠️ Could not fetch godown list:', e);
      }

      // Fetch product cache separately
      try {
        const productsRes = await api.get('/product-details', { timeout: 30000 });
        if (Array.isArray(productsRes.data?.data)) {
          setApiProductsCache(productsRes.data.data);
          console.log('✅ API products cached:', productsRes.data.data.length);
        }
      } catch (e) {
        console.log('⚠️ Could not fetch product cache:', e);
      }
    };
    fetchInitialData();
  }, []);

  const initializeDatabase = async () => {
    try {
      console.log('🔧 Initializing tracker...');
      await fetchFromDatabase();
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      setIsInitialized(true);
      setAllProducts([]);
    }
  };

  const fetchFromDatabase = async () => {
    try {
      console.log('📊 Loading products from database...');
      
      const rows = await db.getAllAsync("SELECT * FROM product_data");
      
      if (rows.length === 0) {
        console.log('📭 Database is empty');
        setAllProducts([]);
        return;
      }

      console.log(`📊 Found ${rows.length} products`);
      
      const products: ProductData[] = rows.map((row: any) => {
        let prices: PriceData[] = [];
        try {
          if (row.prices_json && row.prices_json !== '[]') {
            prices = JSON.parse(row.prices_json);
          }
        } catch (e) {}
        
        // 🔥 FIX: Try catagory first, then fallback to category
        const categoryValue = String(row.catagory || row.category || '').trim();
        
        return {
          code: String(row.code || '').trim(),
          name: String(row.name || 'Unknown').trim(),
          catagory: categoryValue,
          category: categoryValue,
          product: String(row.product || '').trim(),
          brand: String(row.brand || '').trim(),
          unit: String(row.unit || '').trim(),
          taxcode: String(row.taxcode || '0').trim(),
          productcode: String(row.productcode || '').trim(),
          barcode: String(row.barcode || '').trim(),
          quantity: Number(row.quantity || 0),
          supplier: row.supplier || null,
          expirydate: row.expirydate || null,
          prices: prices,
          cost: Number(row.cost || 0),
          bmrp: Number(row.bmrp || 0),
          CO: Number(row.CO || 0),
          MR: Number(row.MR || 0),
          S1: Number(row.S1 || 0),
          S2: Number(row.S2 || 0),
          batch_supplier: String(row.batch_supplier || '').trim(),
          goddown_stock: []

        };
      });

      setAllProducts(products);
      console.log(`✅ Loaded ${products.length} products`);
      
      const withCategory = products.filter(p => p.category).length;
      const withSupplier = products.filter(p => p.supplier).length;
      const withBrand = products.filter(p => p.brand).length;
      
      console.log(`📊 Stats - Category: ${withCategory}, Supplier: ${withSupplier}, Brand: ${withBrand}`);
      
    } catch (error: any) {
      console.error('❌ Error fetching from database:', error?.message);
      setAllProducts([]);
    }
  };

const displayProduct = async (product: any) => {
      let prices: PriceData[] = [];
    if (product.prices && Array.isArray(product.prices)) {
      prices = product.prices;
    } else if (product.prices_json) {
      try {
        prices = JSON.parse(product.prices_json);
      } catch (e) {}
    }
    
    // 🔥 FIX: Try catagory first, then fallback to category
    const categoryValue = product.catagory || product.category || '';
    
    const validatedProduct: ProductData = {
      code: String(product.code || '').trim(),
      name: String(product.name || 'Unknown').trim(),
      catagory: categoryValue,
      category: categoryValue,
      product: String(product.product || '').trim(),
      brand: String(product.brand || '').trim(),
      unit: String(product.unit || '').trim(),
      taxcode: String(product.taxcode || '0').trim(),
      productcode: String(product.productcode || '').trim(),
      barcode: String(product.barcode || '').trim(),
      quantity: Number(product.quantity || 0),
      supplier: product.supplier || null,
      expirydate: product.expirydate || null,
      prices: prices,
      cost: Number(product.cost || 0),
      bmrp: Number(product.bmrp || 0),
      CO: Number(product.CO || 0),
      MR: Number(product.MR || 0),
      S1: Number(product.S1 || 0),
      S2: Number(product.S2 || 0),
      batch_supplier: String(product.batch_supplier || '').trim(),
      goddown_stock: Array.isArray(product.goddown_stock) ? product.goddown_stock : []

    };
    
    // 🔥 CRITICAL DEBUG - Log everything about prices
    console.log('====================================');
    console.log('💰 PRODUCT LOADED - PRICE DEBUG');
    console.log('====================================');
    console.log('Product:', validatedProduct.code, '-', validatedProduct.name);
    console.log('---');
    console.log('Prices Array:', {
      exists: !!validatedProduct.prices,
      isArray: Array.isArray(validatedProduct.prices),
      length: validatedProduct.prices?.length || 0,
      data: validatedProduct.prices
    });
    console.log('---');
    console.log('Individual Price Columns:', {
      CO: validatedProduct.CO,
      MR: validatedProduct.MR,
      S1: validatedProduct.S1,
      S2: validatedProduct.S2,
      cost: validatedProduct.cost,
      bmrp: validatedProduct.bmrp
    });
    console.log('---');
    console.log('Raw product data:', {
      CO: product.CO,
      MR: product.MR,
      S1: product.S1,
      S2: product.S2,
      prices_json: product.prices_json
    });
    console.log('====================================');
    
setProductData(validatedProduct);
    try {
      setGodownLoading(true);
      // Use cached data instead of fresh API call
      if (apiProductsCache.length > 0) {
        const apiData = apiProductsCache.find((p: any) => 
          String(p.code).trim() === String(validatedProduct.code).trim()
        );
        console.log('🏪 Godown match:', apiData?.code, '→ stock:', apiData?.goddown_stock);
        if (apiData && Array.isArray(apiData.goddown_stock) && apiData.goddown_stock.length > 0) {
          setProductData(prev => prev ? { ...prev, goddown_stock: apiData.goddown_stock } : prev);
        } else {
          console.log('⚠️ No goddown_stock for:', validatedProduct.code);
        }
      } else {
        // Fallback to API if cache is empty
        const { createEnhancedAPI } = await import('@/utils/api');
        const api = await createEnhancedAPI();
        const response = await api.get('/product-details', { timeout: 10000 });
        const products = response.data?.data;
        if (Array.isArray(products)) {
          const apiData = products.find((p: any) => 
            String(p.code).trim() === String(validatedProduct.code).trim()
          );
          if (apiData && Array.isArray(apiData.goddown_stock) && apiData.goddown_stock.length > 0) {
            setProductData(prev => prev ? { ...prev, goddown_stock: apiData.goddown_stock } : prev);
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Could not fetch godown stock:', e);
    } finally {
      setGodownLoading(false);
    }
  };
  

  const searchBarcodeWithVariants = async (barcode: string): Promise<ProductData[]> => {
    try {
      const exactRows = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode = ?",
        [barcode]
      );

      const variantRows1 = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode LIKE ?",
        [`${barcode} :%`]
      );

      const variantRows2 = await db.getAllAsync(
        "SELECT * FROM product_data WHERE barcode LIKE ?",
        [`${barcode}:%`]
      );

      const allMatches = [...exactRows, ...variantRows1, ...variantRows2];
      
      return allMatches.map((row: any) => {
        let prices: PriceData[] = [];
        try {
          if (row.prices_json) prices = JSON.parse(row.prices_json);
        } catch (e) {}
        
        // 🔥 FIX: Try catagory first, then fallback to category
        const categoryValue = String(row.catagory || row.category || '').trim();
        
        return {
          code: String(row.code || '').trim(),
          name: String(row.name || 'Unknown').trim(),
          catagory: categoryValue,
          category: categoryValue,
          product: String(row.product || '').trim(),
          brand: String(row.brand || '').trim(),
          unit: String(row.unit || '').trim(),
          taxcode: String(row.taxcode || '0').trim(),
          productcode: String(row.productcode || '').trim(),
          barcode: String(row.barcode || '').trim(),
          quantity: Number(row.quantity || 0),
          supplier: row.supplier || null,
          expirydate: row.expirydate || null,
          prices: prices,
          cost: Number(row.cost || 0),
          bmrp: Number(row.bmrp || 0),
          CO: Number(row.CO || 0),
          MR: Number(row.MR || 0),
          S1: Number(row.S1 || 0),
          S2: Number(row.S2 || 0),
          batch_supplier: String(row.batch_supplier || '').trim(),
          goddown_stock: []
        };
      });
    } catch (error) {
      console.error('❌ Error searching barcode:', error);
      return [];
    }
  };

  const handleBack = () => {
    router.back();
  };

  const toggleSearchMode = () => {
    const newMode = searchMode === 'barcode' ? 'name' : 'barcode';
    setSearchMode(newMode);
    setSearchText('');
    setProductData(null);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSearchTextChange = (text: string) => {
  setSearchText(text);
  
  // Remove the hardware scanning logic - it's now handled by useEffect
  
  if (text.trim().length === 0) {
    setSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  if (searchMode === 'name' && text.trim().length >= 2) {
    const searchLower = text.toLowerCase().trim();
    const filtered = allProducts.filter(product => 
      product.name.toLowerCase().includes(searchLower) ||
      product.brand?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower) ||
      product.product?.toLowerCase().includes(searchLower)
    ).slice(0, 50);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }
};

  const handleSelectSuggestion = (product: ProductData) => {
    setSearchText(product.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    displayProduct(product);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      Alert.alert('Error', 'Please enter a search term');
      return;
    }

    setShowSuggestions(false);
    Keyboard.dismiss();
    setLoading(true);

    try {
      if (searchMode === 'barcode') {
        const foundProducts = await searchBarcodeWithVariants(searchText.trim());
        if (foundProducts.length === 1) {
          displayProduct(foundProducts[0]);
        } else if (foundProducts.length > 1) {
          setSuggestions(foundProducts);
          setShowSuggestions(true);
          setProductData(null);
        } else {
          Alert.alert('Not Found', `No product found for barcode: ${searchText}`);
          setProductData(null);
        }
      } else {
        const searchLower = searchText.toLowerCase().trim();
        const matches = allProducts.filter(product => 
          product.name.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower) ||
          product.product?.toLowerCase().includes(searchLower)
        );

        if (matches.length === 1) {
          displayProduct(matches[0]);
        } else if (matches.length > 1) {
          setSuggestions(matches);
          setShowSuggestions(true);
          setProductData(null);
        } else {
          Alert.alert('Not Found', `No products found matching: "${searchText}"`);
          setProductData(null);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setSearchText('');
    setProductData(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleScanBarcode = async () => {
    if (scanMode === "camera") {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert("Camera Permission", "Camera permission is required");
          return;
        }
      }
      setScanned(false);
      scanLockRef.current = false;
      setProductData(null);
      setSearchText('');
      setShowScanner(true);
    } else {
      setProductData(null);
      setSearchText('');
      setSuggestions([]);
      setShowSuggestions(false);
      
      Alert.alert('Hardware Scanner Ready', 'Scan barcode using Zebra scanner');
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanLockRef.current) return;
    
    scanLockRef.current = true;
    setScanned(true);
    setShowScanner(false);
    
    const foundProducts = await searchBarcodeWithVariants(data);
    
    if (foundProducts.length === 1) {
      setSearchText(data);
      setSearchMode('barcode');
      displayProduct(foundProducts[0]);
    } else if (foundProducts.length > 1) {
      setSearchText(data);
      setSearchMode('barcode');
      setSuggestions(foundProducts);
      setShowSuggestions(true);
      setProductData(null);
    } else {
      Alert.alert('Not Found', `No product found for barcode: ${data}`);
    }
    
    setTimeout(() => {
      setScanned(false);
      scanLockRef.current = false;
    }, 500);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setTimeout(() => {
      setScanned(false);
      scanLockRef.current = false;
    }, 300);
  };

  const syncWithAPI = () => {
    Alert.alert(
      'Sync Products',
      'Download all product data from server?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sync', onPress: () => router.push('/download') }
      ]
    );
  };

  const renderSuggestionItem = ({ item }: { item: ProductData }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(item)}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.suggestionDetailsContainer}>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipLabel}>Stock:</Text>
            <Text style={styles.detailChipValue}>{Math.abs(item.quantity)}</Text>
          </View>
          {item.category ? (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Cat:</Text>
              <Text style={styles.detailChipValue} numberOfLines={1}>{item.category}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999999" />
    </TouchableOpacity>
  );

  // Helper function to get price from prices array OR individual columns
  const getPriceValue = (priceCode: string): number => {
    if (!productData) return 0;
    
    // Try to get from prices array first
    if (productData.prices && productData.prices.length > 0) {
      const price = productData.prices.find(p => p.price_code === priceCode);
      if (price && parseFloat(price.value) > 0) {
        return parseFloat(price.value);
      }
    }
    
    // Fallback to individual columns (these are always saved by sync.ts)
    switch(priceCode) {
      case 'CO': return productData.CO || 0;
      case 'MR': return productData.MR || 0;
      case 'S1': return productData.S1 || 0;
      case 'S2': return productData.S2 || 0;
      default: return 0;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STOCK TRACKER</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={syncWithAPI} style={styles.syncButton}>
            <Ionicons name="refresh" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleScanBarcode} style={styles.searchButton}>
            <Ionicons name="barcode-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={handleCloseScanner}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "code128", "code39", "upc_a", "upc_e"]
            }}
          >
            <View style={styles.scannerOverlay}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseScanner}>
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  {scanned ? 'Processing...' : 'Align barcode within the frame'}
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      
    {searchMode === 'barcode' && !showScanner && (
      <TextInput
        ref={inputRef}
        autoFocus
        value={hardwareScanValue}
        onChangeText={(text) => setHardwareScanValue(text)}
        style={styles.hiddenInput}
        showSoftInputOnFocus={false}
        blurOnSubmit={false}
      />
    )}

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonLeft,
            searchMode === 'barcode' && styles.toggleButtonActive
          ]}
          onPress={toggleSearchMode}
        >
          <Ionicons 
            name="barcode-outline" 
            size={18} 
            color={searchMode === 'barcode' ? '#FFFFFF' : '#666666'} 
          />
          <Text style={[styles.toggleText, searchMode === 'barcode' && styles.toggleTextActive]}>
            Barcode
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonRight,
            searchMode === 'name' && styles.toggleButtonActive
          ]}
          onPress={toggleSearchMode}
        >
          <Ionicons 
            name="search" 
            size={18} 
            color={searchMode === 'name' ? '#FFFFFF' : '#666666'} 
          />
          <Text style={[styles.toggleText, searchMode === 'name' && styles.toggleTextActive]}>
            Item Search
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.inputContainer}>
          <Ionicons 
            name={searchMode === 'barcode' ? 'barcode-outline' : 'search'} 
            size={20} 
            color="#999999" 
            style={styles.inputIcon}
          />
          <TextInput
            ref={null}  
            style={styles.searchInput}
            placeholder={searchMode === 'barcode' ? 'Scan or enter barcode...' : 'Search by name...'}
            value={searchText}
            onChangeText={handleSearchTextChange}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            editable={!loading}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={20} color="#999999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.code}-${index}`}
            renderItem={renderSuggestionItem}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          />
        </View>
      ) : (
        <>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.itemDetailsButton}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Search</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {productData && (
              <>
                {/* Product Details Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Product Details</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Product Name:</Text>
                      <Text style={styles.detailValue}>{productData.name}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Product Code:</Text>
                      <Text style={styles.detailValue}>{productData.code}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Barcode:</Text>
                      <Text style={styles.detailValue}>{productData.barcode}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Stock Quantity:</Text>
                      <Text style={styles.detailValue}>
                        {Math.abs(productData.quantity)} {productData.quantity < 0 ? '(Negative)' : ''}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Category:</Text>
                      <Text style={[styles.detailValue, !productData.category && styles.emptyField]}>
                        {productData.category || 'Not Available'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Product Type:</Text>
                      <Text style={[styles.detailValue, !productData.product && styles.emptyField]}>
                        {productData.product || 'Not Available'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Brand:</Text>
                      <Text style={[styles.detailValue, !productData.brand && styles.emptyField]}>
                        {productData.brand || 'Not Available'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Unit:</Text>
                      <Text style={[styles.detailValue, !productData.unit && styles.emptyField]}>
                        {productData.unit || 'Not Available'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>GST/Tax Code:</Text>
                      <Text style={[styles.detailValue, !productData.taxcode && styles.emptyField]}>
                        {productData.taxcode || '0'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Supplier:</Text>
                      <Text style={[styles.detailValue, !productData.supplier && styles.emptyField]}>
                        {productData.supplier || 'Not Available'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Batch Supplier:</Text>
                      <Text style={[styles.detailValue, !productData.batch_supplier && styles.emptyField]}>
                        {productData.batch_supplier || 'Not Available'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expiry Date:</Text>
                      <Text style={[styles.detailValue, !productData.expirydate && styles.emptyField]}>
                        {productData.expirydate || 'Not Available'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Price Details Section - Simple Table Format */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Price Details</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    {/* Always try to show prices - check both arrays and individual fields */}
                    {(() => {
                      // Check if we have prices from array
                      const hasPricesArray = productData.prices && productData.prices.length > 0;
                      
                      // Check if we have prices from individual fields
                      const CO = productData.CO || 0;
                      const MR = productData.MR || 0;
                      const S1 = productData.S1 || 0;
                      const S2 = productData.S2 || 0;
                      const hasIndividualPrices = CO > 0 || MR > 0 || S1 > 0 || S2 > 0;
                      
                      console.log('💰 Price Display Check:', {
                        hasPricesArray,
                        hasIndividualPrices,
                        CO, MR, S1, S2,
                        pricesArrayLength: productData.prices?.length || 0
                      });
                      
                      if (hasPricesArray) {
                        return productData.prices
                        .filter(price => !(userRole === "Level 1" && price.price_code === "CO"))
                        .map((price, index) => (
                          <View key={index} style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{price.price_name}:</Text>
                            <Text style={styles.detailValue}>₹{parseFloat(price.value).toFixed(2)}</Text>
                          </View>
                        ));
                      } else if (hasIndividualPrices) {
                        // Display from individual fields
                        return (
                          <>
                          {userRole !== "Level 1" && CO > 0 && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>COST (CO):</Text>
                              <Text style={styles.detailValue}>₹{CO.toFixed(2)}</Text>
                            </View>
                          )}
                            {MR > 0 && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>MRP (MR):</Text>
                                <Text style={styles.detailValue}>₹{MR.toFixed(2)}</Text>
                              </View>
                            )}
                            {S1 > 0 && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>RETAIL (S1):</Text>
                                <Text style={styles.detailValue}>₹{S1.toFixed(2)}</Text>
                              </View>
                            )}
                            {S2 > 0 && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>D.P (S2):</Text>
                                <Text style={styles.detailValue}>₹{S2.toFixed(2)}</Text>
                              </View>
                            )}
                          </>
                        );
                      } else {
                        // No prices available anywhere
                        return (
                          <View style={styles.noPriceContainer}>
                            <Ionicons name="warning" size={32} color="#F57C00" style={{marginBottom: 12}} />
                            <Text style={styles.noPriceText}>No price data available</Text>
                            <Text style={styles.noPriceHint}>Click the refresh button (↻) at the top to sync prices from server</Text>
                            <TouchableOpacity onPress={syncWithAPI} style={styles.syncNowButton}>
                              <Ionicons name="refresh" size={18} color="#FFFFFF" />
                              <Text style={styles.syncNowButtonText}>Sync Now</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }
                    })()}
                  </View>
                </View>
                {/* Godown Stock Section */}
               {(godownLoading || (productData.goddown_stock && productData.goddown_stock.length > 0)) && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Godown Stock</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    {godownLoading ? (
                      <ActivityIndicator color="#2E7D7A" style={{ paddingVertical: 16 }} />
                    ) : productData.goddown_stock.map((item, index) => {
                      const godown = godownList.find(g => g.goddownid === item.goddownid);
                      const displayName = godown?.name || item.goddownid || 'Unknown';
                      return (
                        <View key={index} style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{displayName}:</Text>
                          <Text style={styles.detailValue}>{item.quantity} {productData.unit}</Text>
                        </View>
                      );
                    })}
                    </View>
                  </View>
                )}
              </>
            )}
            {!productData && !loading && (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={searchMode === 'barcode' ? 'barcode-outline' : 'search-outline'} 
                  size={64} 
                  color="#CCCCCC" 
                />
                <Text style={styles.emptyText}>
                  {searchMode === 'barcode' 
                    ? 'Scan or enter a barcode to view product details'
                    : 'Search for a product by name to get started'
                  }
                </Text>
                {allProducts.length > 0 && (
                  <Text style={styles.productCount}>
                    {allProducts.length.toLocaleString()} products available
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  hiddenInput: {
    height: 1,
    width: 1,
    opacity: 0,
    position: 'absolute',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  syncButton: {
    padding: 12,
  },
  searchButton: {
    padding: 12,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3b82f6',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  instructionsText: {
    color: 'white',
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  toggleButtonRight: {
    borderLeftWidth: 0,
  },
  toggleButtonActive: {
    backgroundColor: '#2E7D7A',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginLeft: 6,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB74D',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  clearIcon: {
    padding: 8,
    marginRight: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 235 : 235,
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionContent: {
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  suggestionDetailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  detailChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555555',
    marginRight: 3,
  },
  detailChipValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333333',
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
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyField: {
    color: '#999999',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  noPriceContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    marginVertical: 8,
  },
  noPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F57C00',
    marginBottom: 8,
    textAlign: 'center',
  },
  noPriceHint: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  syncNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D7A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  syncNowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    marginTop: 16,
    marginBottom: 8,
  },
  productCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});

