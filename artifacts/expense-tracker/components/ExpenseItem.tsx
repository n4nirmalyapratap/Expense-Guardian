import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOutLeft } from "react-native-reanimated";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from "@/constants/categoryColors";
import type { Expense } from "@/context/ExpenseContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  expense: Expense;
  index?: number;
  showDelete?: boolean;
}

export function ExpenseItem({ expense, index = 0, showDelete = true }: Props) {
  const colors = useColors();
  const { removeExpense } = useExpenses();

  const catColor = CATEGORY_COLORS[expense.category];
  const catIcon = CATEGORY_ICONS[expense.category] as keyof typeof Feather.glyphMap;
  const catLabel = CATEGORY_LABELS[expense.category];

  const dateStr = new Date(expense.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const handleDelete = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert("Delete Expense", `Remove ₹${expense.amount} at ${expense.merchant}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeExpense(expense.id),
      },
    ]);
  };

  return (
    <Animated.View
      entering={
        Platform.OS !== "web"
          ? FadeInDown.delay(index * 40).duration(350)
          : undefined
      }
      exiting={Platform.OS !== "web" ? FadeOutLeft.duration(250) : undefined}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: catColor + "20" }]}>
        <Feather name={catIcon} size={18} color={catColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.merchant, { color: colors.foreground }]} numberOfLines={1}>
          {expense.merchant}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {catLabel} · {dateStr}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          ₹{expense.amount.toLocaleString("en-IN")}
        </Text>
        {expense.isAIParsed && (
          <View style={[styles.aiBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.aiText, { color: colors.primary }]}>AI</Text>
          </View>
        )}
      </View>
      {showDelete && (
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  merchant: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  deleteBtn: {
    padding: 4,
  },
});
