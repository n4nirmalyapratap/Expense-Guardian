import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BarChart } from "@/components/BarChart";
import { DonutChart } from "@/components/DonutChart";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from "@/constants/categoryColors";
import { Feather } from "@expo/vector-icons";
import type { Category } from "@/context/ExpenseContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const PERIODS = ["7D", "30D", "All"] as const;
type Period = (typeof PERIODS)[number];

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, getTotalByCategory, getTotalByDay } = useExpenses();
  const [period, setPeriod] = useState<Period>("7D");

  const filtered = useMemo(() => {
    if (period === "All") return expenses;
    const days = period === "7D" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    return expenses.filter((e) => e.date >= cutoff);
  }, [expenses, period]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [filtered]);

  const segments = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => ({
        category: cat as Category,
        value: val,
        color: CATEGORY_COLORS[cat as Category],
        label: CATEGORY_LABELS[cat as Category],
      }));
  }, [categoryTotals]);

  const barDays = period === "7D" ? 7 : period === "30D" ? 14 : 14;
  const dailyData = getTotalByDay(barDays);
  const barData = dailyData.map((d) => ({
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
    }),
    value: d.total,
  }));

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingTop: topPad + 16,
        }}
      >
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(0).duration(400) : undefined}
          style={styles.header}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Analytics
          </Text>
          <View style={[styles.periodBar, { backgroundColor: colors.muted }]}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodBtn,
                  period === p && { backgroundColor: colors.primary },
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodLabel,
                    { color: period === p ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            Total Spending
          </Text>
          <Text style={[styles.totalAmount, { color: colors.foreground }]}>
            {fmt(total)}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            {filtered.length} transactions
          </Text>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(160).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Spending by Category
          </Text>
          <View style={styles.donutCenter}>
            <DonutChart
              segments={segments}
              total={total}
              centerText={fmt(total)}
              centerSubtext="Total"
              size={180}
            />
          </View>
          <View style={styles.catList}>
            {segments.map((seg) => {
              const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0";
              const icon = CATEGORY_ICONS[seg.category] as keyof typeof Feather.glyphMap;
              return (
                <View key={seg.category} style={styles.catRow}>
                  <View
                    style={[styles.catIconWrap, { backgroundColor: seg.color + "22" }]}
                  >
                    <Feather name={icon} size={14} color={seg.color} />
                  </View>
                  <Text
                    style={[styles.catName, { color: colors.foreground }]}
                  >
                    {seg.label}
                  </Text>
                  <View style={styles.catBar}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          backgroundColor: seg.color,
                          width: `${(seg.value / total) * 100}%` as `${number}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catPct, { color: colors.mutedForeground }]}>
                    {pct}%
                  </Text>
                  <Text style={[styles.catAmt, { color: colors.foreground }]}>
                    {fmt(seg.value)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(240).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Daily Spending
          </Text>
          <BarChart data={barData} height={180} barColor={colors.primary} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  periodBar: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  donutCenter: { alignItems: "center", marginBottom: 20 },
  catList: { gap: 12 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: {
    width: 90,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  catBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  catBarFill: { height: "100%", borderRadius: 3 },
  catPct: { width: 38, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  catAmt: { width: 60, fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
});
