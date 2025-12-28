import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';

// ========================================
// CONFIG
// ========================================

// 🔥 HARDCODED OWNER TOKEN (owner3@tabz.app, id = 3)
// This is the exact token you just got from /auth/login.
const HARD_CODED_OWNER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImVtYWlsIjoib3duZXIzQHRhYnouYXBwIiwiaWF0IjoxNzY0ODAxMDEwLCJleHAiOjE3NjU0MDU4MTB9.9DGBzWur_FW7jbGPTdN9bOwF5HMFtc0fQjiw15t4BYA';

// BACKEND URL
// - iOS simulator:  'http://localhost:3000'
// - Android emulator: 'http://10.0.2.2:3000'
// - Real phone: 'http://YOUR_PC_LAN_IP:3000'
const BASE_URL = 'http://localhost:3000';

// ========================================
// TYPES
// ========================================

type OwnerWallet = {
  id: number;
  userId: number;
  balanceCents: number;
  spendableBalanceCents: number;
  cashoutAvailableCents: number;
  createdAt: string;
  updatedAt: string;
};

type OwnerStats = {
  total: {
    ordersCount: number;
    amountCents: number;
    feeCents: number;
    payoutCents: number;
  };
  byVenue: Array<{
    venueId: number;
    venueName: string;
    ordersCount: number;
    amountCents: number;
    feeCents: number;
    payoutCents: number;
  }>;
};

type OwnerOrder = {
  orderId: number;
  createdAt: string;
  status: string;
  itemName: string;
  quantity: number;
  amountCents: number;
  feeCents: number;
  payoutCents: number;
  buyerId: number;
  venueId: number;
  venueName: string;
};

type OwnerDashboardResponse = {
  wallet: OwnerWallet;
  stats: OwnerStats;
  recentOrders: OwnerOrder[];
};

// ========================================
// SCREEN
// ========================================
export default function OwnerDashboardScreen() {
  const [data, setData] = useState<OwnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${BASE_URL}/store-items/owner/dashboard`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${HARD_CODED_OWNER_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = (await res.json()) as OwnerDashboardResponse;
      setData(json);
    } catch (err: any) {
      console.error('Failed to load owner dashboard:', err);
      setError(err?.message ?? 'Failed to load owner dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>Loading owner dashboard…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={[styles.centerText, styles.errorText]}>
          {error}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>
          No data available for this owner.
        </Text>
      </View>
    );
  }

  const { wallet, stats, recentOrders } = data;

  const formatMoney = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Wallet summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wallet</Text>
        <Text style={styles.label}>
          Spendable Balance:{' '}
          <Text style={styles.value}>
            {formatMoney(wallet.spendableBalanceCents)}
          </Text>
        </Text>
        <Text style={styles.label}>
          Cashout Available:{' '}
          <Text style={styles.value}>
            {formatMoney(wallet.cashoutAvailableCents)}
          </Text>
        </Text>
      </View>

      {/* Overall stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Totals</Text>
        <Text style={styles.label}>
          Orders:{' '}
          <Text style={styles.value}>
            {stats.total.ordersCount}
          </Text>
        </Text>
        <Text style={styles.label}>
          Gross Sales:{' '}
          <Text style={styles.value}>
            {formatMoney(stats.total.amountCents)}
          </Text>
        </Text>
        <Text style={styles.label}>
          Platform Fees:{' '}
          <Text style={styles.value}>
            {formatMoney(stats.total.feeCents)}
          </Text>
        </Text>
        <Text style={styles.label}>
          Payouts:{' '}
          <Text style={styles.value}>
            {formatMoney(stats.total.payoutCents)}
          </Text>
        </Text>
      </View>

      {/* Stats by venue */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>By Venue</Text>
        {stats.byVenue.length === 0 ? (
          <Text style={styles.subText}>No venues with sales yet.</Text>
        ) : (
          stats.byVenue.map((v) => (
            <View key={v.venueId} style={styles.venueRow}>
              <Text style={styles.venueName}>{v.venueName}</Text>
              <Text style={styles.venueLine}>
                Orders: {v.ordersCount}
              </Text>
              <Text style={styles.venueLine}>
                Gross: {formatMoney(v.amountCents)}
              </Text>
              <Text style={styles.venueLine}>
                Fees: {formatMoney(v.feeCents)}
              </Text>
              <Text style={styles.venueLine}>
                Payouts: {formatMoney(v.payoutCents)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Recent orders */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Orders</Text>
        {recentOrders.length === 0 ? (
          <Text style={styles.subText}>No recent orders.</Text>
        ) : (
          <FlatList
            data={recentOrders}
            keyExtractor={(item) => String(item.orderId)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.orderRow}>
                <Text style={styles.orderItemName}>
                  {item.itemName}
                </Text>
                <Text style={styles.orderVenue}>
                  {item.venueName}
                </Text>
                <Text style={styles.orderLine}>
                  Qty: {item.quantity} • Gross:{' '}
                  {formatMoney(item.amountCents)}
                </Text>
                <Text style={styles.orderLine}>
                  Fee: {formatMoney(item.feeCents)} • Payout:{' '}
                  {formatMoney(item.payoutCents)}
                </Text>
                <Text style={styles.orderStatus}>
                  {item.status} • {item.createdAt}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    marginTop: 4,
  },
  value: {
    fontWeight: '600',
  },
  subText: {
    fontSize: 14,
    color: '#666',
  },
  venueRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
  },
  venueLine: {
    fontSize: 14,
    color: '#444',
  },
  orderRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderVenue: {
    fontSize: 14,
    color: '#555',
  },
  orderLine: {
    fontSize: 14,
    color: '#444',
  },
  orderStatus: {
    marginTop: 2,
    fontSize: 13,
    color: '#777',
  },
});
