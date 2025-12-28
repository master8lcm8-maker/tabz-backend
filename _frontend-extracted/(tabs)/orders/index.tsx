import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';

// ========================================
// CONFIG
// ========================================

// 🔥 1) PUT YOUR REAL BUYER TOKEN HERE (FULL JWT, NO "...")
// Example shape: "xxxxx.yyyyy.zzzzz"
const HARD_CODED_TOKEN = '<PASTE_FULL_BUYER_JWT_HERE>';

// 🔥 2) BACKEND URL
// - Android emulator:  'http://10.0.2.2:3000'
// - iOS simulator:     'http://localhost:3000'
// - Real phone:        'http://YOUR_PC_LAN_IP:3000'
const BASE_URL = 'http://localhost:3000';

// ========================================
// TYPES
// ========================================
type MyOrder = {
  orderId: number;
  createdAt: string;
  status: string;
  itemName: string;
  quantity: number;
  amountCents: number;
  feeCents: number;
  payoutCents: number;
  venueId: number;
  venueName: string;
};

type MyOrdersResponse = {
  value: MyOrder[];
  Count: number;
};

// ========================================
// SCREEN
// ========================================
export default function OrdersScreen() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`${BASE_URL}/store-items/my-orders`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${HARD_CODED_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as MyOrdersResponse;
      setOrders(data.value || []);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setError(err?.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading && orders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>Loading your orders…</Text>
      </View>
    );
  }

  if (error && orders.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.centerText, styles.errorText]}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => String(item.orderId)}
      contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.centerText}>No orders yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.itemName}>{item.itemName}</Text>

          <Text style={styles.sub}>
            {item.quantity} × ${(item.amountCents / 100).toFixed(2)}
          </Text>

          <Text style={styles.venue}>Venue: {item.venueName}</Text>

          <View style={styles.row}>
            <Text style={styles.fee}>
              Fee: ${(item.feeCents / 100).toFixed(2)}
            </Text>
            <Text style={styles.payout}>
              Payout: ${(item.payoutCents / 100).toFixed(2)}
            </Text>
          </View>

          <Text style={styles.status}>Status: {item.status}</Text>
          <Text style={styles.date}>{item.createdAt}</Text>
        </View>
      )}
    />
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  centerText: {
    marginTop: 8,
    fontSize: 16,
  },
  errorText: {
    color: '#c00',
  },
  card: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 3,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
  },
  sub: {
    marginTop: 4,
    fontSize: 15,
    color: '#555',
  },
  venue: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  fee: {
    fontSize: 14,
    color: '#a00',
  },
  payout: {
    fontSize: 14,
    color: '#0a0',
  },
  status: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  date: {
    marginTop: 4,
    fontSize: 13,
    color: '#777',
  },
});
