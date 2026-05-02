import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddExpenseModal } from "@/components/AddExpenseModal";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/constants/categoryColors";
import type { Category } from "@/context/ExpenseContext";
import type { ParsedExpense } from "@/utils/smsParser";
import { SAMPLE_SMS_MESSAGES, parseSMS } from "@/utils/smsParser";
import { useColors } from "@/hooks/useColors";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [smsText, setSmsText] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [parseError, setParseError] = useState("");
  const [addPrefill, setAddPrefill] = useState<{
    amount?: string;
    merchant?: string;
    category?: Category;
  } | null>(null);

  const handleParse = () => {
    if (!smsText.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const result = parseSMS(smsText.trim());
    if (result) {
      setParsed(result);
      setParseError("");
    } else {
      setParsed(null);
      setParseError("Could not detect an expense in this message. Try a bank debit SMS.");
    }
  };

  const handleLoadSample = (sample: string) => {
    setSmsText(sample);
    setParsed(null);
    setParseError("");
  };

  const handleAddParsed = () => {
    if (!parsed) return;
    setAddPrefill({
      amount: parsed.amount.toString(),
      merchant: parsed.merchant,
      category: parsed.category,
    });
  };

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
            Scan Messages
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Paste any bank SMS to auto-detect expenses
          </Text>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.inputHeader}>
            <Feather name="message-square" size={16} color={colors.primary} />
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>
              Paste SMS Message
            </Text>
          </View>
          <TextInput
            style={[
              styles.smsInput,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            multiline
            numberOfLines={4}
            placeholder="Paste your bank SMS here...&#10;e.g. Rs 500 debited at Swiggy"
            placeholderTextColor={colors.mutedForeground}
            value={smsText}
            onChangeText={(t) => {
              setSmsText(t);
              setParsed(null);
              setParseError("");
            }}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.parseBtn,
              {
                backgroundColor: smsText.trim() ? colors.primary : colors.border,
              },
            ]}
            onPress={handleParse}
            disabled={!smsText.trim()}
            activeOpacity={0.8}
          >
            <Feather
              name="cpu"
              size={16}
              color={smsText.trim() ? "#fff" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.parseBtnText,
                { color: smsText.trim() ? "#fff" : colors.mutedForeground },
              ]}
            >
              Detect Expense with AI
            </Text>
          </TouchableOpacity>

          {parseError ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.destructive + "15" },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {parseError}
              </Text>
            </View>
          ) : null}

          {parsed && (
            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.duration(300) : undefined}
              style={[
                styles.parsedBox,
                { backgroundColor: colors.accent + "12", borderColor: colors.accent + "40" },
              ]}
            >
              <View style={styles.parsedRow}>
                <Feather name="check-circle" size={16} color={colors.accent} />
                <Text style={[styles.parsedTitle, { color: colors.accent }]}>
                  Expense Detected
                </Text>
              </View>
              <View style={styles.parsedDetails}>
                <View style={styles.parsedField}>
                  <Text style={[styles.parsedKey, { color: colors.mutedForeground }]}>Amount</Text>
                  <Text style={[styles.parsedVal, { color: colors.foreground }]}>
                    ₹{parsed.amount.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.parsedField}>
                  <Text style={[styles.parsedKey, { color: colors.mutedForeground }]}>Merchant</Text>
                  <Text style={[styles.parsedVal, { color: colors.foreground }]}>
                    {parsed.merchant}
                  </Text>
                </View>
                <View style={styles.parsedField}>
                  <Text style={[styles.parsedKey, { color: colors.mutedForeground }]}>Category</Text>
                  <View
                    style={[
                      styles.catBadge,
                      {
                        backgroundColor:
                          CATEGORY_COLORS[parsed.category] + "22",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catBadgeText,
                        { color: CATEGORY_COLORS[parsed.category] },
                      ]}
                    >
                      {CATEGORY_LABELS[parsed.category]}
                    </Text>
                  </View>
                </View>
                <View style={styles.parsedField}>
                  <Text style={[styles.parsedKey, { color: colors.mutedForeground }]}>Confidence</Text>
                  <Text style={[styles.parsedVal, { color: colors.foreground }]}>
                    {Math.round(parsed.confidence * 100)}%
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddParsed}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Add to Expenses</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(200).duration(400) : undefined}
          style={styles.samplesSection}
        >
          <Text style={[styles.samplesTitle, { color: colors.foreground }]}>
            Try Sample Messages
          </Text>
          <Text style={[styles.samplesSub, { color: colors.mutedForeground }]}>
            Tap any message to load it
          </Text>
          {SAMPLE_SMS_MESSAGES.map((msg, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.sampleItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => handleLoadSample(msg)}
              activeOpacity={0.7}
            >
              <Feather
                name="message-square"
                size={14}
                color={colors.primary}
                style={{ marginTop: 1 }}
              />
              <Text
                style={[styles.sampleText, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {msg}
              </Text>
              <Feather name="chevron-right" size={16} color={colors.border} />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>

      {addPrefill && (
        <AddExpenseModal
          visible={!!addPrefill}
          onClose={() => {
            setAddPrefill(null);
            setParsed(null);
            setSmsText("");
          }}
          prefill={addPrefill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  inputHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  smsInput: {
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    fontSize: 13,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  parseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  parseBtnText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  parsedBox: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  parsedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  parsedTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  parsedDetails: { gap: 8 },
  parsedField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  parsedKey: { fontSize: 13, fontFamily: "Inter_400Regular" },
  parsedVal: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 13,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  samplesSection: { paddingHorizontal: 16, gap: 8 },
  samplesTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  samplesSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  sampleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sampleText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
