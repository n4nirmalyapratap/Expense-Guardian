import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddExpenseModal } from "@/components/AddExpenseModal";
import { DonutChart } from "@/components/DonutChart";
import { ExpenseItem } from "@/components/ExpenseItem";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/constants/categoryColors";
import type { Category } from "@/context/ExpenseContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import {
  checkSmsPermission,
  isSmsReadingSupported,
} from "@/utils/smsReader";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    expenses,
    getTotalByCategory,
    getTotalThisMonth,
    getTotalThisWeek,
    hasCompletedFirstScan,
    isLoading,
  } = useExpenses();
  const [showAdd, setShowAdd] = useState(false);
  const [showSmsBanner, setShowSmsBanner] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (isLoading || promptedRef.current) return;
    if (!isSmsReadingSupported() || hasCompletedFirstScan) return;
    promptedRef.current = true;

    (async () => {
      const granted = await checkSmsPermission();
      setShowSmsBanner(true);
      if (granted) return;
      setTimeout(() => {
        Alert.alert(
          "Auto-Import Your Expenses",
          "Allow Expense Tracker to read your SMS so we can automatically detect bank transactions and add them as expenses. Your messages stay 100% on your device.",
          [
            { text: "Maybe Later", style: "cancel" },
            {
              text: "Set Up Now",
              onPress: () => router.push("/messages"),
            },
          ]
        );
      }, 600);
    })();
  }, [isLoading, hasCompletedFirstScan, router]);

  const totalMonth = getTotalThisMonth();
  const totalWeek = getTotalThisWeek();

  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return expenses
      .filter((e) => e.date.startsWith(today))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const categoryTotals = getTotalByCategory();
  const topSegments = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, val]) => ({
        category: cat as Category,
        value: val,
        color: CATEGORY_COLORS[cat as Category],
        label: CATEGORY_LABELS[cat as Category],
      }));
  }, [categoryTotals]);

  const topTotal = topSegments.reduce((s, c) => s + c.value, 0);
  const recentExpenses = expenses.slice(0, 8);
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
          style={styles.headerRow}
        >
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              My Expenses
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowAdd(true)}
          >
            <Feather name="plus" size={20} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).duration(400) : undefined}
          style={styles.heroWrap}
        >
          <LinearGradient
            colors={["#7C3AED", "#4C1D95"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroLabel}>This Month</Text>
            <Text style={styles.heroAmount}>{fmt(totalMonth)}</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>This Week</Text>
                <Text style={styles.heroStatVal}>{fmt(totalWeek)}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Today</Text>
                <Text style={styles.heroStatVal}>{fmt(todayTotal)}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Transactions</Text>
                <Text style={styles.heroStatVal}>{expenses.length}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {showSmsBanner && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(120).duration(400) : undefined}
            style={[
              styles.smsBanner,
              {
                backgroundColor: colors.accent + "15",
                borderColor: colors.accent + "40",
              },
            ]}
          >
            <View style={[styles.smsBannerIcon, { backgroundColor: colors.accent }]}>
              <Feather name="zap" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smsBannerTitle, { color: colors.foreground }]}>
                Auto-Import from SMS
              </Text>
              <Text style={[styles.smsBannerSub, { color: colors.mutedForeground }]}>
                Detect all your bank transactions automatically
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.smsBannerBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.push("/messages")}
              activeOpacity={0.85}
            >
              <Text style={styles.smsBannerBtnText}>Set Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSmsBanner(false)}
              hitSlop={8}
              style={styles.smsBannerClose}
            >
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {topSegments.length > 0 && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(160).duration(400) : undefined}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Spending Breakdown
            </Text>
            <View style={styles.chartRow}>
              <DonutChart
                segments={topSegments}
                total={topTotal}
                centerText={fmt(topTotal)}
                centerSubtext="Total"
                size={148}
              />
              <View style={styles.legend}>
                {topSegments.map((seg) => (
                  <View key={seg.category} style={styles.legendRow}>
                    <View
                      style={[styles.legendDot, { backgroundColor: seg.color }]}
                    />
                    <Text
                      style={[styles.legendLabel, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {seg.label}
                    </Text>
                    <Text style={[styles.legendAmt, { color: colors.foreground }]}>
                      {fmt(seg.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(240).duration(400) : undefined}
        >
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Expenses
            </Text>
          </View>
          {recentExpenses.length === 0 ? (
            <View
              style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No expenses yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap + to add your first expense
              </Text>
            </View>
          ) : (
            recentExpenses.map((expense, i) => (
              <ExpenseItem key={expense.id} expense={expense} index={i} />
            ))
          )}
        </Animated.View>
      </ScrollView>

      <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heroWrap: { paddingHorizontal: 16, marginBottom: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 22,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  heroAmount: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStat: { flex: 1 },
  heroStatLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  heroStatVal: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 12,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  smsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  smsBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smsBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 1,
  },
  smsBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  smsBannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  smsBannerBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  smsBannerClose: {
    padding: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  legend: { flex: 1, gap: 8 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  legendAmt: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  emptyState: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
