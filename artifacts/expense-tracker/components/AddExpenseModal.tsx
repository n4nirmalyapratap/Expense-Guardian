import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from "@/constants/categoryColors";
import type { Category } from "@/context/ExpenseContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: Category[] = [
  "food",
  "transport",
  "shopping",
  "entertainment",
  "utilities",
  "health",
  "education",
  "travel",
  "other",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  prefill?: { amount?: string; merchant?: string; category?: Category };
}

export function AddExpenseModal({ visible, onClose, prefill }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addExpense } = useExpenses();

  const [amount, setAmount] = useState(prefill?.amount ?? "");
  const [merchant, setMerchant] = useState(prefill?.merchant ?? "");
  const [category, setCategory] = useState<Category>(prefill?.category ?? "food");
  const [note, setNote] = useState("");

  const reset = () => {
    setAmount("");
    setMerchant("");
    setCategory("food");
    setNote("");
  };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0 || !merchant.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await addExpense({
      amount: num,
      merchant: merchant.trim(),
      category,
      date: new Date().toISOString(),
      isAIParsed: false,
      note: note.trim() || undefined,
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isValid = parseFloat(amount) > 0 && merchant.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Add Expense
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View
            style={[styles.amountContainer, { borderColor: colors.border }]}
          >
            <Text style={[styles.currency, { color: colors.primary }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="Merchant name"
            placeholderTextColor={colors.mutedForeground}
            value={merchant}
            onChangeText={setMerchant}
          />

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              const catColor = CATEGORY_COLORS[cat];
              const icon = CATEGORY_ICONS[cat] as keyof typeof Feather.glyphMap;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catBtn,
                    {
                      backgroundColor: selected
                        ? catColor + "25"
                        : colors.muted,
                      borderColor: selected ? catColor : "transparent",
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Feather
                    name={icon}
                    size={16}
                    color={selected ? catColor : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.catLabel,
                      { color: selected ? catColor : colors.mutedForeground },
                    ]}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="Note (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: isValid ? colors.primary : colors.border },
            ]}
            onPress={handleSave}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.saveBtnText,
                { color: isValid ? "#fff" : colors.mutedForeground },
              ]}
            >
              Add Expense
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    paddingBottom: 8,
    gap: 6,
  },
  currency: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: -4,
  },
  categoryScroll: { marginHorizontal: -20 },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  catBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  catLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  saveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
