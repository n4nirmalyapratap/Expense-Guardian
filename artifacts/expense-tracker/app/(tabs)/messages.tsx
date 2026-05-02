import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { useExpenses } from "@/context/ExpenseContext";
import type { ParsedExpense } from "@/utils/smsParser";
import { SAMPLE_SMS_MESSAGES, parseSMS } from "@/utils/smsParser";
import {
  checkSmsPermission,
  isSmsReadingSupported,
  requestSmsPermission,
  scanSMSForExpenses,
} from "@/utils/smsReader";
import { useColors } from "@/hooks/useColors";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    addManyExpenses,
    lastSmsScanDate,
    setLastSmsScanDate,
    hasCompletedFirstScan,
    markFirstScanComplete,
  } = useExpenses();

  const [smsText, setSmsText] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [parseError, setParseError] = useState("");
  const [addPrefill, setAddPrefill] = useState<{
    amount?: string;
    merchant?: string;
    category?: Category;
  } | null>(null);

  const smsSupported = isSmsReadingSupported();
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");

  useEffect(() => {
    if (!smsSupported) return;
    checkSmsPermission().then(setHasPermission);
  }, [smsSupported]);

  const runScan = async (mode: "initial" | "incremental") => {
    setIsScanning(true);
    setScanStatus(
      mode === "initial"
        ? "Reading your SMS history…"
        : "Checking for new messages…"
    );
    try {
      const minDate =
        mode === "initial"
          ? Date.now() - 365 * 24 * 60 * 60 * 1000
          : lastSmsScanDate ?? Date.now() - 24 * 60 * 60 * 1000;

      const found = await scanSMSForExpenses({
        minDate,
        bankSendersOnly: true,
        maxCount: mode === "initial" ? 5000 : 500,
      });

      if (found.length === 0) {
        setScanStatus(
          mode === "initial"
            ? "No bank transactions found in your inbox"
            : "You're all caught up — no new transactions"
        );
        await setLastSmsScanDate(Date.now());
        if (mode === "initial") await markFirstScanComplete();
        return;
      }

      const items = found.map((f) => ({
        amount: f.amount,
        merchant: f.merchant,
        category: f.category,
        date: f.date,
        rawText: f.rawText,
        isAIParsed: true,
      }));

      const { added, skipped } = await addManyExpenses(items);
      await setLastSmsScanDate(Date.now());
      if (mode === "initial") await markFirstScanComplete();

      setScanStatus(
        `Added ${added} expense${added === 1 ? "" : "s"}` +
          (skipped > 0 ? ` · ${skipped} already in list` : "")
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setScanStatus("Scan failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleEnableSMS = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const granted = await requestSmsPermission();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "To auto-detect bank expenses, please enable SMS access in your device Settings → Apps → Expense Tracker → Permissions."
      );
      return;
    }
    await runScan("initial");
  };

  const handleRescan = () => runScan("incremental");

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

  const lastScanLabel = lastSmsScanDate
    ? new Date(lastSmsScanDate).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "never";

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
            Auto-detect bank expenses from your SMS inbox
          </Text>
        </Animated.View>

        {smsSupported && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(40).duration(400) : undefined}
            style={[
              styles.autoCard,
              { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" },
            ]}
          >
            <View style={styles.autoHeader}>
              <View style={[styles.autoIconWrap, { backgroundColor: colors.primary }]}>
                <Feather name="zap" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.autoTitle, { color: colors.foreground }]}>
                  Auto-Scan Inbox
                </Text>
                <Text style={[styles.autoSub, { color: colors.mutedForeground }]}>
                  {hasPermission
                    ? hasCompletedFirstScan
                      ? `Last scanned: ${lastScanLabel}`
                      : "Ready to scan your SMS history"
                    : "Allow SMS access to auto-detect transactions"}
                </Text>
              </View>
            </View>

            {scanStatus ? (
              <View
                style={[
                  styles.statusBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Feather
                  name={isScanning ? "loader" : "check-circle"}
                  size={14}
                  color={isScanning ? colors.primary : colors.accent}
                />
                <Text style={[styles.statusText, { color: colors.foreground }]}>
                  {scanStatus}
                </Text>
              </View>
            ) : null}

            {!hasPermission ? (
              <TouchableOpacity
                style={[styles.autoBtn, { backgroundColor: colors.primary }]}
                onPress={handleEnableSMS}
                disabled={isScanning}
                activeOpacity={0.85}
              >
                <Feather name="shield" size={16} color="#fff" />
                <Text style={styles.autoBtnText}>Enable SMS Auto-Scan</Text>
              </TouchableOpacity>
            ) : !hasCompletedFirstScan ? (
              <TouchableOpacity
                style={[styles.autoBtn, { backgroundColor: colors.primary }]}
                onPress={() => runScan("initial")}
                disabled={isScanning}
                activeOpacity={0.85}
              >
                <Feather name="download" size={16} color="#fff" />
                <Text style={styles.autoBtnText}>
                  {isScanning ? "Scanning…" : "Import All History"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.autoBtn, { backgroundColor: colors.primary }]}
                onPress={handleRescan}
                disabled={isScanning}
                activeOpacity={0.85}
              >
                <Feather name="refresh-cw" size={16} color="#fff" />
                <Text style={styles.autoBtnText}>
                  {isScanning ? "Scanning…" : "Scan for New Messages"}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
              Your messages are processed entirely on your device. Nothing leaves your
              phone.
            </Text>
          </Animated.View>
        )}

        {!smsSupported && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(40).duration(400) : undefined}
            style={[
              styles.infoCard,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              {Platform.OS === "ios"
                ? "iOS doesn't allow apps to read SMS. Paste messages below to add them manually."
                : "SMS auto-scan is only available on the Android build."}
            </Text>
          </Animated.View>
        )}

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.inputHeader}>
            <Feather name="message-square" size={16} color={colors.primary} />
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>
              Paste SMS Manually
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
  autoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  autoHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  autoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  autoTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  autoSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 13,
    borderRadius: 12,
  },
  autoBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  privacyText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
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
