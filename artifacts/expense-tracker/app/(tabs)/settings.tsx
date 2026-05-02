import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExpenses } from "@/context/ExpenseContext";
import {
  cancelAllReminders,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from "@/utils/notifications";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "@settings_v1";

interface Settings {
  notificationsEnabled: boolean;
  reminderHour: number;
  monthlyBudget: string;
}

const DEFAULT: Settings = {
  notificationsEnabled: false,
  reminderHour: 20,
  monthlyBudget: "",
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, getTotalThisMonth } = useExpenses();
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((v) => {
      if (v) setSettings({ ...DEFAULT, ...JSON.parse(v) });
    });
  }, []);

  const saveSettings = async (updated: Settings) => {
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  };

  const toggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please allow notifications in device settings."
        );
        return;
      }
      await scheduleDailyReminder(settings.reminderHour, 0);
    } else {
      await cancelAllReminders();
    }
    await saveSettings({ ...settings, notificationsEnabled: val });
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your expense records. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("@expenses_v2");
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            Alert.alert("Done", "All data cleared. Restart the app to see changes.");
          },
        },
      ]
    );
  };

  const totalMonth = getTotalThisMonth();
  const budget = parseFloat(settings.monthlyBudget);
  const budgetPct =
    budget > 0 ? Math.min((totalMonth / budget) * 100, 100) : 0;

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
            Settings
          </Text>
        </Animated.View>

        {budget > 0 && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(80).duration(400) : undefined}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Monthly Budget
            </Text>
            <View style={styles.budgetRow}>
              <Text style={[styles.budgetSpent, { color: colors.foreground }]}>
                ₹{totalMonth.toLocaleString("en-IN")}
              </Text>
              <Text style={[styles.budgetOf, { color: colors.mutedForeground }]}>
                of ₹{budget.toLocaleString("en-IN")}
              </Text>
            </View>
            <View
              style={[styles.progressTrack, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${budgetPct}%` as `${number}%`,
                    backgroundColor:
                      budgetPct > 90
                        ? colors.destructive
                        : budgetPct > 70
                          ? "#F59E0B"
                          : colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.budgetPct, { color: colors.mutedForeground }]}>
              {budgetPct.toFixed(1)}% used
            </Text>
          </Animated.View>
        )}

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(160).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            NOTIFICATIONS
          </Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[styles.rowIcon, { backgroundColor: colors.primary + "20" }]}
              >
                <Feather name="bell" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                  Daily Reminder
                </Text>
                <Text
                  style={[styles.rowSub, { color: colors.mutedForeground }]}
                >
                  Remind me to track expenses
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{
                false: colors.border,
                true: colors.primary + "80",
              }}
              thumbColor={
                settings.notificationsEnabled ? colors.primary : colors.mutedForeground
              }
            />
          </View>
          {settings.notificationsEnabled && (
            <View style={[styles.row, { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 14 }]}>
              <View style={styles.rowLeft}>
                <View
                  style={[styles.rowIcon, { backgroundColor: colors.accent + "20" }]}
                >
                  <Feather name="clock" size={16} color={colors.accent} />
                </View>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                  Reminder Time
                </Text>
              </View>
              <View style={styles.timeRow}>
                {[18, 19, 20, 21, 22].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.timeBtn,
                      {
                        backgroundColor:
                          settings.reminderHour === h
                            ? colors.primary
                            : colors.muted,
                      },
                    ]}
                    onPress={() => {
                      saveSettings({ ...settings, reminderHour: h });
                      if (settings.notificationsEnabled) {
                        scheduleDailyReminder(h, 0);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.timeBtnText,
                        {
                          color:
                            settings.reminderHour === h
                              ? "#fff"
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {h}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(240).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            BUDGET
          </Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[styles.rowIcon, { backgroundColor: "#10B98120" }]}
              >
                <Feather name="target" size={16} color="#10B981" />
              </View>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                Monthly Budget
              </Text>
            </View>
            <View style={styles.budgetInput}>
              <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.budgetField, { color: colors.foreground }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                value={settings.monthlyBudget}
                onChangeText={(v) =>
                  saveSettings({ ...settings, monthlyBudget: v })
                }
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(320).duration(400) : undefined}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            DATA
          </Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[styles.rowIcon, { backgroundColor: colors.accent + "20" }]}
              >
                <Feather name="database" size={16} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                  Stored Locally
                </Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {expenses.length} records · 100% on-device
                </Text>
              </View>
            </View>
            <View
              style={[styles.localBadge, { backgroundColor: colors.accent + "20" }]}
            >
              <Text style={[styles.localText, { color: colors.accent }]}>
                Private
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.row,
              {
                borderTopColor: colors.border,
                borderTopWidth: 1,
                paddingTop: 14,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <View
                style={[styles.rowIcon, { backgroundColor: colors.destructive + "15" }]}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: colors.destructive }]}>
                  Clear All Data
                </Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  Permanently delete all records
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.clearBtn,
                { backgroundColor: colors.destructive + "15" },
              ]}
              onPress={handleClearData}
            >
              <Text style={[styles.clearBtnText, { color: colors.destructive }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(400).duration(400) : undefined}
          style={[styles.appInfo, { borderColor: colors.border }]}
        >
          <Text style={[styles.appName, { color: colors.foreground }]}>
            Expense Tracker
          </Text>
          <Text style={[styles.appVer, { color: colors.mutedForeground }]}>
            Fully local · No cloud · Your data stays on your device
          </Text>
        </Animated.View>
      </ScrollView>
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
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: -4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  timeRow: { flexDirection: "row", gap: 6 },
  timeBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  timeBtnText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  budgetInput: { flexDirection: "row", alignItems: "center", gap: 2 },
  rupee: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  budgetField: {
    width: 80,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 8,
  },
  budgetSpent: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  budgetOf: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  budgetPct: { fontSize: 12, fontFamily: "Inter_400Regular" },
  localBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  localText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  clearBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  clearBtnText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  appInfo: {
    margin: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  appName: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  appVer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
