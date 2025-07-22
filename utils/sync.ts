// utils/sync.ts
import db from "./database";

export const saveMasterData = async (data: any[]) => {
  await db.withTransactionAsync(async () => {
    const beforeDelete = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM master_data"
    );
    console.log(
      `🔍 Rows in master_data before delete: ${beforeDelete?.count ?? 0}`
    );

    await db.execAsync("DELETE FROM master_data");

    const afterDelete = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM master_data"
    );
    console.log(
      `🧹 Rows in master_data after delete: ${afterDelete?.count ?? 0}`
    );

    for (const item of data) {
      await db.runAsync(
        `INSERT INTO master_data (code, name, place) VALUES (?, ?, ?)`,
        [item.code, item.name, item.place]
      );
    }

    const afterInsert = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM master_data"
    );
    console.log(
      `✅ Rows in master_data after insert: ${afterInsert?.count ?? 0}`
    );
  });
  return data.length;
};

export const saveProductData = async (data: any[]) => {
  await db.withTransactionAsync(async () => {
    const countBeforeDelete = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM product_data"
    );
    console.log(
      "🔍 Rows in product_data before delete:",
      countBeforeDelete?.count
    );

    await db.execAsync("DELETE FROM product_data");

    const countAfterDelete = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM product_data"
    );
    console.log(
      "🧹 Rows in product_data after delete:",
      countAfterDelete?.count
    );

    for (const item of data) {
      await db.runAsync(
        `INSERT INTO product_data (code, name, barcode, quantity, salesprice, bmrp, cost)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.code,
          item.name,
          item.barcode,
          item.quantity,
          item.salesprice,
          item.bmrp,
          item.cost,
        ]
      );
    }

    const countAfterInsert = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM product_data"
    );
    console.log(
      "✅ Rows in product_data after insert:",
      countAfterInsert?.count
    );
  });
  return data.length;
};

export const getLocalDataStats = async () => {
  const masterCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM master_data"
  );

  const productCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM product_data"
  );

  const syncInfo = await db.getFirstAsync<{ last_synced: string }>(
    "SELECT last_synced FROM sync_info WHERE id = 1"
  );

  return {
    masterCount: masterCount?.count ?? 0,
    productCount: productCount?.count ?? 0,
    lastSynced: syncInfo?.last_synced ?? null,
  };
};

export const updateLastSynced = async () => {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_info (id, last_synced) VALUES (1, ?)`,
    [now]
  );
};
