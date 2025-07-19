import { View, Text, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import * as SQLite from "expo-sqlite";

export default function Entry() {
  const [masterData, setMasterData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const db = SQLite.openDatabaseSync("magicpedia.db");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const masterRows = await db.getAllAsync(
          "SELECT * FROM master_data LIMIT 20"
        );
        setMasterData(masterRows);

        const productRows = await db.getAllAsync(
          "SELECT * FROM product_data LIMIT 20"
        );
        setProductData(productRows);
      } catch (err) {
        console.error("❌ Error reading DB:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 50 }} className="p-4">
      <Text className="text-2xl font-bold mt-6 mb-3">Stored Master Data</Text>
      {masterData.length === 0 ? (
        <Text className="italic text-gray-500">No master data found</Text>
      ) : (
        masterData.map((item, index) => (
          <View
            key={`master-${index}`}
            className="mb-4 p-3 bg-gray-200 rounded-lg"
          >
            {Object.entries(item).map(([key, value]) => (
              <Text key={key} className="text-base mb-1">
                {key}: {String(value)}
              </Text>
            ))}
          </View>
        ))
      )}

      <Text className="text-2xl font-bold mt-6 mb-3">Stored Product Data</Text>
      {productData.length === 0 ? (
        <Text className="italic text-gray-500">No product data found</Text>
      ) : (
        productData.map((item, index) => (
          <View
            key={`product-${index}`}
            className="mb-4 p-3 bg-gray-200 rounded-lg"
          >
            {Object.entries(item).map(([key, value]) => (
              <Text key={key} className="text-base mb-1">
                {key}: {String(value)}
              </Text>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}
