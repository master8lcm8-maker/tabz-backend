import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const API_BASE = "http://10.0.0.239:3000";

const OWNER_FALLBACK_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImVtYWlsIjoib3duZXIzQHRhYnouYXBwIiwiaWF0IjoxNzY1MzM0NjA5LCJleHAiOjE3NjU5Mzk0MDl9.4ZaCbBmY0nhuBm385JzY0J7DIFtG3WPgbcfc8TLmkS4";

type CashoutStatus = "PENDING" | "COMPLETED" | "FAILED";

type Cashout = {
  id: number;
  amountCents: number;
  status: CashoutStatus;
  failureReason: string | null;
  destinationLast4: string | null;
  createdAt: string;
  updatedAt: string;
};

type Metrics = {
  totalCashouts: number;
  completedCashouts: number;
  failedCashouts: number;
  pendingCashouts: number;
  totalPaidOutCents: number;
  lastCashout?: Cashout | null;
};

function centsToDollars(cents: number | string | null | undefined): string {
  const n =
    typeof cents === "number"
      ? cents
      : Number.parseInt(String(cents), 10) || 0;
  return (n / 100).toFixed(2);
}

function statusColor(status: CashoutStatus): string {
  switch (status) {
    case "COMPLETED":
      return "#15FF7F";
    case "PENDING":
      return "#FFC94A";
    case "FAILED":
    default:
      return "#FF4F4F";
  }
}

export default function OwnerCashoutsScreen() {
  const [loading, setLoading] = useState(true);
  const [cashouts, setCashouts] = useState<Cashout[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    Authorization: `Bearer ${OWNER_FALLBACK_TOKEN}`,
    "Content-Type": "application/json",
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // METRICS
      const metricsRes = await fetch(`${API_BASE}/wallet/metrics`, {
        headers,
      });

      if (!metricsRes.ok) {
        const txt = await metricsRes.text();
        throw new Error(`Metrics HTTP ${metricsRes.status}: ${txt}`);
      }

      const metricsJson = await metricsRes.json();
      console.log("OWNER CASHOUTS metricsJson:", metricsJson);
      setMetrics(metricsJson);

      // CASHOUTS LIST
      const listRes = await fetch(`${API_BASE}/wallet/cashouts`, {
        headers,
      });

      if (!listRes.ok) {
        const txt = await listRes.text();
        throw new Error(`Cashouts HTTP ${listRes.status}: ${txt}`);
      }

      const cashoutsJson = (await listRes.json()) as Cashout[];
      console.log("OWNER CASHOUTS cashoutsJson length:", cashoutsJson.length);
      console.log("OWNER CASHOUTS sample row:", cashoutsJson[0]);
      setCashouts(cashoutsJson);
    } catch (err: any) {
      console.log("OWNER CASHOUTS LOAD ERROR:", err);
      setError(err?.message || "Failed to load cashouts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && cashouts.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#15FF7F" />
      </ThemedView>
    );
  }

  const m = metrics;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* HEADER */}
      <ThemedText type="title" style={{ marginBottom: 4 }}>
        Owner Cashouts
      </ThemedText>
      <ThemedText
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        Track every cashout created from this owner wallet.
      </ThemedText>

      {/* DEBUG LINE */}
      <ThemedText
        style={{
          color: "rgba(21,255,127,0.8)",
          fontSize: 11,
          marginBottom: 10,
        }}
      >
        Loaded {cashouts.length} cashouts from backend.
      </ThemedText>

      {/* ERROR BANNER (NON-BLOCKING) */}
      {error && (
        <View style={styles.errorBanner}>
          <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
        </View>
      )}

      {/* SUMMARY CARD */}
      {m && (
        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryLabel}>Total paid out</ThemedText>
          <ThemedText style={styles.summaryAmount}>
            ${centsToDollars(m.totalPaidOutCents)}
          </ThemedText>

          <View style={styles.summaryRow}>
            <View style={styles.summaryPill}>
              <ThemedText style={styles.summaryPillLabel}>Completed</ThemedText>
              <ThemedText style={[styles.summaryPillValue, { color: "#15FF7F" }]}>
                {m.completedCashouts}
              </ThemedText>
            </View>

            <View style={styles.summaryPill}>
              <ThemedText style={styles.summaryPillLabel}>Pending</ThemedText>
              <ThemedText style={[styles.summaryPillValue, { color: "#FFC94A" }]}>
                {m.pendingCashouts}
              </ThemedText>
            </View>

            <View style={styles.summaryPill}>
              <ThemedText style={styles.summaryPillLabel}>Failed</ThemedText>
              <ThemedText style={[styles.summaryPillValue, { color: "#FF4F4F" }]}>
                {m.failedCashouts}
              </ThemedText>
            </View>
          </View>

          {m.lastCashout && (
            <View style={{ marginTop: 10 }}>
              <ThemedText style={styles.summarySmallLabel}>
                Most recent cashout
              </ThemedText>
              <ThemedText style={styles.summarySmallValue}>
                ${centsToDollars(m.lastCashout.amountCents)} ·{" "}
                {m.lastCashout.status.toLowerCase()}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* LIST HEADER */}
      <View style={styles.listHeaderRow}>
        <ThemedText style={styles.listHeaderText}>Recent cashouts</ThemedText>
        <TouchableOpacity onPress={loadData} style={styles.smallRefresh}>
          <ThemedText style={styles.smallRefreshText}>Refresh</ThemedText>
        </TouchableOpacity>
      </View>

      {/* CASHOUTS LIST */}
      {cashouts.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyTitle}>No cashouts yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            When you cash out from the Owner Wallet, they will appear here.
          </ThemedText>
        </View>
      ) : (
        cashouts.map((c) => {
          const color = statusColor(c.status);
          const created = new Date(c.createdAt).toLocaleString();
          const last4 = c.destinationLast4 || "????";

          return (
            <View key={c.id} style={styles.cashoutRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={styles.cashoutAmount}>
                  ${centsToDollars(c.amountCents)}
                </ThemedText>
                <ThemedText style={styles.cashoutMeta}>
                  **** {last4} · {created}
                </ThemedText>
                {c.failureReason && (
                  <ThemedText style={styles.cashoutFailureReason}>
                    Reason: {c.failureReason}
                  </ThemedText>
                )}
              </View>

              <View style={styles.cashoutRight}>
                <View style={[styles.statusChip, { borderColor: color }]}>
                  <ThemedText style={[styles.statusChipText, { color }]}>
                    {c.status.toLowerCase()}
                  </ThemedText>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#05060E",
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: "#05060E",
    justifyContent: "center",
    alignItems: "center",
  },
  errorBanner: {
    backgroundColor: "rgba(255,79,79,0.15)",
    borderColor: "#FF4F4F",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: "#FFB0B0",
    fontSize: 12,
  },
  errorText: {
    color: "#FF4F4F",
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#15FF7F",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#000", fontWeight: "700" },

  summaryCard: {
    backgroundColor: "#080A15",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(21,255,127,0.45)",
    shadowColor: "#15FF7F",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#15FF7F",
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  summaryPill: {
    flexDirection: "column",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#050811",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minWidth: 80,
  },
  summaryPillLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
  },
  summaryPillValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  summarySmallLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    marginTop: 4,
  },
  summarySmallValue: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },

  listHeaderRow: {
    marginTop: 4,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listHeaderText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  smallRefresh: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(21,255,127,0.5)",
  },
  smallRefreshText: {
    fontSize: 11,
    color: "#15FF7F",
    fontWeight: "600",
  },

  cashoutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#080A15",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
    gap: 12,
  },
  cashoutAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cashoutMeta: {
    fontSize: 11,
    color: "rgba(200,220,255,0.8)",
  },
  cashoutFailureReason: {
    fontSize: 11,
    color: "#FFB0B0",
  },
  cashoutRight: {
    alignItems: "flex-end",
    gap: 6,
  },

  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
  },

  emptyState: {
    marginTop: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#080A15",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "rgba(210,220,255,0.8)",
  },
});
