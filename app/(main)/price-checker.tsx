// app/(main)/price-checker.tsx
// PRICE CHECKER MODULE
// - Device (hardware/Bluetooth) barcode scanner ONLY — no camera scanner.
// - A hidden TextInput stays focused at all times to receive scanner
//   keystrokes (scanners act as HID keyboards). A visible readout mirrors
//   the value live so the user can see the barcode as it's scanned.
// - showSoftInputOnFocus={false} on the hidden input blocks the on-screen
//   keyboard, so there is no manual typing path — only a hardware scanner
//   (or a hardware keyboard) can populate it.
// - Reads directly from the local SQLite `product_data` table (same table
//   and same barcode-variant matching as tracker.tsx) — no network call.
// - Responsive layout (useWindowDimensions) + manual Portrait/Landscape
//   toggle persisted in SecureStore — sticks across login/logout/refresh
//   until the user flips it again.
import { createEnhancedAPI } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const db = SQLite.openDatabaseSync('magicpedia.db');

const ORIENTATION_STORAGE_KEY = 'priceCheckerOrientation'; // "landscape" | "portrait"

interface PriceData {
  price_code: string;
  price_name: string;
  value: string;
}

interface GodownStock {
  goddownid: string;
  product: string;
  barcode: string;
  quantity: number;
}

interface LiveProduct {
  code: string;
  name: string;
  barcode: string;
  category: string;
  product: string;
  brand: string;
  unit: string;
  quantity: number;
  taxcode: string;
  supplier: string;
  batch_supplier: string;
  expirydate: string;
  prices: PriceData[];
  CO: number;
  MR: number;
  S1: number;
  S2: number;
  goddown_stock: GodownStock[];
}

const COLORS = {
  bg: '#F5F5F5',
  card: '#FFFFFF',
  border: '#E0E0E0',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  teal: '#2E7D7A',
  tealTint: '#E0F2F1',
  tealBorder: '#B2DFDB',
  orange: '#F57C00',
  orangeTint: '#FFF3E0',
  orangeBorder: '#FFCC80',
  blue: '#1565C0',
  blueTint: '#E3F2FD',
  blueBorder: '#90CAF9',
  danger: '#D32F2F',
};

type OrientationPref = 'landscape' | 'portrait';

export default function PriceCheckerScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [liveLoading, setLiveLoading] = useState(false);
  const [productData, setProductData] = useState<LiveProduct | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orientationPref, setOrientationPref] = useState<OrientationPref>('landscape');
  const [orientationReady, setOrientationReady] = useState(false);
  const [deviceScanValue, setDeviceScanValue] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');
 const scanLockRef = useRef(false);
const deviceInputRef = useRef<TextInput>(null);
const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const lastCharTimeRef = useRef<number>(0);
const scanStartTimeRef = useRef<number>(0);
const isReceivingRef = useRef(false);
const [godownList, setGodownList] = useState<{ goddownid: string; name: string }[]>([]);
const [apiProductsCache, setApiProductsCache] = useState<any[]>([]);
const [godownLoading, setGodownLoading] = useState(false);

  const isLandscape = width > height;

// Load godown list + full product cache ONCE, in the background, so a
// scan can look up goddown_stock without a per-scan network round-trip.
useEffect(() => {
  (async () => {
    try {
      const api = await createEnhancedAPI();
      const [godownRes, productsRes] = await Promise.all([
        api.get('/acc-goddown'),
        api.get('/product-details', { timeout: 30000 }),
      ]);
      if (Array.isArray(godownRes.data?.data)) {
        setGodownList(godownRes.data.data);
      }
      if (Array.isArray(productsRes.data?.data)) {
        setApiProductsCache(productsRes.data.data);
      }
    } catch (e) {
      console.log('⚠️ Could not preload godown/product cache:', e);
    }
  })();
}, []);

useEffect(() => {
  if (productData || liveLoading || errorMsg) return;
  const t = setTimeout(() => {
    deviceInputRef.current?.focus();
  }, 100);
  return () => clearTimeout(t);
}, [productData, liveLoading, errorMsg]);

    // Lock to landscape immediately — that's this screen's default — then
  // only switch to portrait if the user had previously chosen it.
  useEffect(() => {
    (async () => {
      try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        const saved = await SecureStore.getItemAsync(ORIENTATION_STORAGE_KEY);
        const pref: OrientationPref = saved === 'portrait' ? 'portrait' : 'landscape';
        setOrientationPref(pref);
        if (pref === 'portrait') {
          await applyOrientationLock(pref);
        }
      } catch (e) {
        console.warn('⚠️ Could not load orientation preference:', e);
      } finally {
        setOrientationReady(true);
      }
    })();
    // Intentionally no cleanup/unlock on unmount — the chosen orientation
    // should persist until the user explicitly switches it again.
  }, []);

    const applyOrientationLock = async (pref: OrientationPref) => {
    try {
      if (pref === 'landscape') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    } catch (e) {
      console.warn('⚠️ Orientation lock failed:', e);
    }
  };

  const toggleOrientation = useCallback(async () => {
    const next: OrientationPref = orientationPref === 'landscape' ? 'portrait' : 'landscape';
    setOrientationPref(next);
    await applyOrientationLock(next);
    try {
      await SecureStore.setItemAsync(ORIENTATION_STORAGE_KEY, next);
    } catch (e) {
      console.warn('⚠️ Could not save orientation preference:', e);
    }
  }, [orientationPref]);

  // Normalize a raw server record into the shape we display
  const mapLiveRecord = (row: any): LiveProduct => {
    let prices: PriceData[] = [];
    if (Array.isArray(row.prices)) {
      prices = row.prices;
    } else if (typeof row.prices_json === 'string') {
      try { prices = JSON.parse(row.prices_json); } catch (e) { prices = []; }
    }

    const getPrice = (code: string, fallback: number) => {
      const found = prices.find((p) => p.price_code === code);
      return found ? parseFloat(found.value) || 0 : fallback;
    };

    const CO = getPrice('CO', Number(row.CO || row.cost || 0));
    const MR = getPrice('MR', Number(row.MR || row.bmrp || row.mrp || 0));
    const S1 = getPrice('S1', Number(row.S1 || row.salesprice || 0));
    const S2 = getPrice('S2', Number(row.S2 || row.secondprice || 0));

    return {
      code: String(row.code || row.productcode || '').trim(),
      name: String(row.name || row.item_name || 'Unknown').trim(),
      barcode: String(row.barcode || row.code || '').trim(),
      category: String(row.category || row.catagory || '').trim(),
      product: String(row.product || '').trim(),
      brand: String(row.brand || '').trim(),
      unit: String(row.unit || '').trim(),
      quantity: Number(row.quantity || 0),
      taxcode: String(row.taxcode || '0').trim(),
      supplier: String(row.supplier || '').trim(),
      batch_supplier: String(row.batch_supplier || '').trim(),
      expirydate: String(row.expirydate || '').trim(),
      prices,
      CO, MR, S1, S2,
      goddown_stock: [],
    };
  };

  const fetchLivePrice = async (barcode: string) => {
  setLiveLoading(true);
  setErrorMsg(null);
  const fetchStart = Date.now();
  try {
    // Exact match + the two "code :suffix" / "code:suffix" variants —
    // identical matching strategy to tracker.tsx's searchBarcodeWithVariants.
    const exactRows = await db.getAllAsync(
      'SELECT * FROM product_data WHERE barcode = ?',
      [barcode]
    );
    const variantRows1 = await db.getAllAsync(
      'SELECT * FROM product_data WHERE barcode LIKE ?',
      [`${barcode} :%`]
    );
    const variantRows2 = await db.getAllAsync(
      'SELECT * FROM product_data WHERE barcode LIKE ?',
      [`${barcode}:%`]
    );
    const records: any[] = [...exactRows, ...variantRows1, ...variantRows2];

    console.log(`⏱️ DB lookup finished in ${Date.now() - fetchStart}ms`);
    console.log('🔍 Scanned barcode:', JSON.stringify(barcode));
    console.log('🔍 Records found:', records.length);

    const match = records[0];

    if (!match) {
      console.log('❌ No matching record found for barcode:', barcode);
      setProductData(null);
      setErrorMsg(`No product found for barcode: ${barcode}`);
      return;
    }

    console.log('✅ MATCHED RECORD (before mapping):', JSON.stringify(match, null, 2));

    const mapped = mapLiveRecord(match);

    console.log('✅ MAPPED PRODUCT (after mapLiveRecord):', JSON.stringify(mapped, null, 2));

    setProductData(mapped);

    // Godown stock isn't in the local DB — fetch it separately, non-blocking,
    // from the cached product list (or a one-off API call if cache is empty).
    (async () => {
      try {
        setGodownLoading(true);
        let apiData: any = null;
        if (apiProductsCache.length > 0) {
          apiData = apiProductsCache.find(
            (p: any) => String(p.code).trim() === String(mapped.code).trim()
          );
        } else {
          const api = await createEnhancedAPI();
          const response = await api.get('/product-details', { timeout: 10000 });
          const products = response.data?.data;
          if (Array.isArray(products)) {
            apiData = products.find(
              (p: any) => String(p.code).trim() === String(mapped.code).trim()
            );
          }
        }
        if (apiData && Array.isArray(apiData.goddown_stock) && apiData.goddown_stock.length > 0) {
          setProductData((prev) => (prev ? { ...prev, goddown_stock: apiData.goddown_stock } : prev));
        }
      } catch (e) {
        console.log('⚠️ Could not fetch godown stock:', e);
      } finally {
        setGodownLoading(false);
      }
    })();
 } catch (error: any) {
  console.error(`❌ Local DB lookup failed after ${Date.now() - fetchStart}ms:`, error?.message);
  setProductData(null);
  setErrorMsg('Could not read local database. Try syncing data again.');
} finally {
  setLiveLoading(false);
}
};

  const handleDeviceSubmit = () => {
    const code = deviceScanValue.trim();
    setDeviceScanValue('');
    if (!code || scanLockRef.current) return;
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    setLastScannedCode(code);
    scanLockRef.current = true;
    fetchLivePrice(code).finally(() => {
      scanLockRef.current = false;
    });
  };

  // "Done" — clear the result and bring the scanner back on screen.
 const handleDone = () => {
  setProductData(null);
  setErrorMsg(null);
  setLastScannedCode('');
  scanLockRef.current = false;
  lastCharTimeRef.current = 0;
  setTimeout(() => deviceInputRef.current?.focus(), 150);
};

  // Auto-recover from an error (e.g. barcode mismatch) — without this,
  // the hidden scanner input stays unmounted forever until "Done" is
  // tapped, so the scanner appears to stop working after any mismatch.
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => {
      handleDone();
    }, 2000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const scale = Math.min(width, height) / 380;
  const clampedScale = Math.max(0.85, Math.min(scale, 1.35));
  const showResult = !!productData || !!errorMsg || liveLoading;

  if (!orientationReady) {
    return (
      <View style={styles.bootLoader}>
        <ActivityIndicator size="large" color="#2E7D7A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar hidden={isLandscape} />

      {/* Top bar — back, orientation toggle */}
        <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtnHeader} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.brandCenter}>
          <Ionicons name="scan-outline" size={18 * clampedScale} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={[styles.brandTitle, { fontSize: 14 * clampedScale }]}>PRICE CHECKER</Text>
        </View>

        <View style={styles.topRightControls}>
          <TouchableOpacity style={styles.iconBtnHeader} onPress={toggleOrientation}>
            <Ionicons name={orientationPref === 'landscape' ? 'phone-portrait-outline' : 'phone-landscape-outline'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SCANNER — device (hardware/Bluetooth) scanner only, shown while idle */}
      {!showResult && (
        <View style={styles.scannerScreen}>
          <View style={styles.devicePane}>
          <View style={styles.scanIconCircle}>
            <Ionicons name="scan-outline" size={56 * clampedScale} color="#FFFFFF" />
          </View>       
               <Text style={styles.deviceTitle}>Ready for Device Scanner</Text>
            <Text style={styles.deviceHint}>Point your handheld/Bluetooth scanner and scan the barcode</Text>

            {/* Visible readout — mirrors what the scanner is typing in real time */}
            <View style={styles.barcodeReadoutBox}>
              <Ionicons name="barcode-outline" size={18} color="#f5001d" />
              <Text style={styles.barcodeReadoutText} numberOfLines={1}>
                {deviceScanValue || lastScannedCode || 'Waiting for scan…'}
              </Text>
            </View>

           <TextInput
              ref={deviceInputRef}
              autoFocus
              value={deviceScanValue}
              onChangeText={(text) => {
                const now = Date.now();
                if (deviceScanValue.length === 0 && text.length > 0) {
                  scanStartTimeRef.current = now;
                }
                isReceivingRef.current = true;
                const gap = lastCharTimeRef.current ? now - lastCharTimeRef.current : 0;
                lastCharTimeRef.current = now;
                console.log(`⌨️ char gap: ${gap}ms | buffer so far: "${text}" (len ${text.length})`);

                setDeviceScanValue(text);
                if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

                scanTimeoutRef.current = setTimeout(() => {
                  isReceivingRef.current = false;
                  const elapsed = Date.now() - scanStartTimeRef.current;
                  console.log(`⏱️ Scan settled after ${elapsed}ms, length ${text.trim().length}: "${text.trim()}"`);
                  if (text.trim().length >= 6) {
                    handleDeviceSubmit();
                  } else {
                    console.log('⚠️ Ignoring auto-submit — buffer too short, likely still scanning');
                  }
                }, 400);
              }}
              onSubmitEditing={handleDeviceSubmit}
              style={styles.hiddenInput}
              showSoftInputOnFocus={false}
              blurOnSubmit={false}
            />
          </View>

          <Text style={styles.scanHint}>Waiting for scanner input…</Text>
        </View>
      )}

      {/* RESULT — replaces the scanner entirely until "Done" is tapped */}
      {showResult && (
        <View style={styles.resultScreen}>
          {liveLoading && (
            <View style={styles.centerFill}>
              <ActivityIndicator size="large" color="#2E7D7A" />
              <Text style={styles.loadingText}>Fetching live price…</Text>
              {!!lastScannedCode && (
                <Text style={styles.loadingBarcode}>Barcode: {lastScannedCode}</Text>
              )}
            </View>
          )}

          {!liveLoading && errorMsg && (
            <View style={styles.centerFill}>
              <Ionicons name="alert-circle-outline" size={48 * clampedScale} color="#D32F2F" />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {!liveLoading && productData && (
            <ScrollView style={styles.productScroll} contentContainerStyle={styles.productWrap}>
              <Text style={[styles.productName, { fontSize: 26 * clampedScale }]} numberOfLines={2}>
                {productData.name}
              </Text>

              {/* Product Details — full details, same fields Tracker shows */}
              <View style={styles.detailsContainer}>
                <View style={styles.sectionHeaderBar}>
                  <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.sectionHeaderText}>PRODUCT DETAILS</Text>
                </View>
                <View style={{ paddingHorizontal: 14 }}>
                  <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Product Code:</Text>
                  <Text style={styles.detailValue}>{productData.code || 'Not Available'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Barcode:</Text>
                  <Text style={styles.detailValue}>{productData.barcode || 'Not Available'}</Text>
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
                  <Text style={styles.detailLabel}>Stock Quantity:</Text>
                  <Text style={styles.detailValue}>
                    {Math.abs(productData.quantity)}{productData.quantity < 0 ? ' (Negative)' : ''}
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

              {/* Price — MRP & Sale Price only */}
                           {/* Price — MRP & Sale Price only */}
              <View style={[styles.priceRow, { flexDirection: isLandscape || width > 500 ? 'row' : 'column' }]}>
                <View style={[styles.priceTile, styles.mrTile]}>
                  <View style={styles.priceTileLabelChip}>
                    <Text style={styles.priceLabel}>MRP</Text>
                  </View>
                  <Ionicons name="pricetag-outline" size={18} color="#1565C0" />
                  <Text style={[styles.priceValue, { fontSize: 34 * clampedScale }]}>
                    ₹{productData.MR.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.priceTile, styles.s1Tile]}>
                  <View style={styles.priceTileLabelChip}>
                    <Text style={styles.priceLabel}>SALE PRICE</Text>
                  </View>
                  <Ionicons name="cash-outline" size={18} color="#F57C00" />
                  <Text style={[styles.priceValue, { fontSize: 34 * clampedScale }]}>
                    ₹{productData.S1.toFixed(2)}
                  </Text>
                </View>
              </View>

                           {(godownLoading || (productData.goddown_stock && productData.goddown_stock.length > 0)) && (
                <View style={styles.godownSection}>
                  <View style={styles.sectionHeaderBar}>
                    <Ionicons name="business-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.sectionHeaderText}>GODOWN STOCK</Text>
                  </View>
                  <View style={{ paddingHorizontal: 14 }}>
                    {godownLoading ? (
                      <ActivityIndicator color="#2E7D7A" style={{ paddingVertical: 12 }} />
                    ) : (
                      productData.goddown_stock.map((item, index) => {
                        const godown = godownList.find((g) => g.goddownid === item.goddownid);
                        const displayName = godown?.name || item.goddownid || 'Unknown';
                        return (
                          <View key={index} style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{displayName}:</Text>
                            <Text style={styles.detailValue}>{item.quantity} {productData.unit}</Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// AFTER
const styles = StyleSheet.create({
  bootLoader: { flex: 1, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  iconBtn: { padding: 8, backgroundColor: '#E0F2F1', borderRadius: 20 },
  brandTitle: { color: '#2E7D7A', fontWeight: '800', letterSpacing: 3 },
devicePane: {
  flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8,
  backgroundColor: COLORS.tealTint,   // soft tint instead of flat white
  borderRadius: 20,
  borderWidth: 2,
  borderColor: COLORS.teal,           // bold, not pastel
  shadowColor: COLORS.teal, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
},
scanIconCircle: {
  width: 96, height: 96, borderRadius: 48,
  backgroundColor: COLORS.teal,
  alignItems: 'center', justifyContent: 'center',
},  deviceTitle: { color: '#333333', fontSize: 16, fontWeight: '700', marginTop: 6 },
  deviceHint: { color: '#666666', fontSize: 12, textAlign: 'center', paddingHorizontal: 30 },
barcodeReadoutBox: {
  flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18,
  paddingHorizontal: 18, paddingVertical: 14,
  backgroundColor: '#ef98cc',     // solid, not a pale tint
  borderRadius: 12, borderWidth: 2, borderColor: '#f67ab8',
  minWidth: '70%', maxWidth: '90%',
  shadowColor: COLORS.orange, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
},
barcodeReadoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 1, flexShrink: 1 },  hiddenInput: { height: 1, width: 1, opacity: 0, position: 'absolute' },
  scanHint: { color: '#999999', fontSize: 12, marginTop: 14, textAlign: 'center' },
  resultScreen: { flex: 1, padding: 24 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#666666', fontSize: 13 },
  loadingBarcode: { color: '#999999', fontSize: 12 },
  errorText: { color: '#D32F2F', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  productScroll: { flex: 1 },
  productWrap: { paddingBottom: 24 },
  productName: { color: '#333333', fontWeight: '800', marginBottom: 14 },
detailsContainer: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden', marginBottom: 20 },  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailLabel: { color: '#666666', fontSize: 13, fontWeight: '600' },
  detailValue: { color: '#333333', fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  emptyField: { color: '#999999', fontStyle: 'italic' },
  priceRow: { gap: 16 },
  godownSection: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 14, paddingVertical: 6, marginTop: 20 },
  godownHeader: { color: '#2E7D7A', fontSize: 13, fontWeight: '800', letterSpacing: 1, paddingVertical: 10 },
  priceTile: { flex: 1, borderRadius: 18, paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  mrTile: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9' },
  s1Tile: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFB74D' },
  priceLabel: { color: '#666666', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  priceValue: { color: '#333333', fontWeight: '800', marginTop: 6 },
  doneBtn: { marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D7A', paddingVertical: 14, borderRadius: 12, alignSelf: 'flex-start', paddingHorizontal: 28 },
  doneBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
sectionHeaderBar: {
  backgroundColor: '#2E7D7A',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderTopLeftRadius: 14,
  borderTopRightRadius: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
sectionHeaderText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '800',
  letterSpacing: 1,
},
priceTileLabelChip: {
  backgroundColor: 'rgba(255,255,255,0.6)',
  paddingHorizontal: 10,
  paddingVertical: 3,
  borderRadius: 6,
  marginBottom: 8,
},
topBar: {
  height: 56,
  backgroundColor: COLORS.teal,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 12,
},
brandCenter: {
  position: 'absolute',
  left: 0,
  right: 0,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
brandTitle: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 3 }, // was teal-on-white, now white-on-teal
iconBtnHeader: { padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20 },
topRightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
scannerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: COLORS.bg },
});