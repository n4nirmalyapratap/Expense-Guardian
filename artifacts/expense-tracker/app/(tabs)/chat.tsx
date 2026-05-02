import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Category } from "@/context/ExpenseContext";
import { useExpenses } from "@/context/ExpenseContext";
import {
  type ChatMessage,
  createMessage,
  processMessage,
} from "@/utils/chatAI";
import { useColors } from "@/hooks/useColors";

const SUGGESTIONS = [
  "How much this week?",
  "Top categories",
  "Today's spending",
  "Biggest expense",
  "This month total",
];

const WELCOME: ChatMessage = createMessage(
  "assistant",
  "Hi! I'm your AI expense assistant. I can answer questions about your spending patterns, summarize by category, or help you add expenses. What would you like to know?"
);

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const colors = useColors();
  const isUser = msg.role === "user";
  return (
    <Animated.View
      entering={Platform.OS !== "web" ? FadeInUp.duration(200) : undefined}
      style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}
    >
      {!isUser && (
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}
        >
          <Feather name="cpu" size={14} color={colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? "#fff" : colors.foreground },
          ]}
        >
          {msg.text}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: isUser ? "rgba(255,255,255,0.6)" : colors.mutedForeground },
          ]}
        >
          {new Date(msg.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense } = useExpenses();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const userMsg = createMessage("user", text);
      setMessages((prev) => [userMsg, ...prev]);
      setInput("");
      setIsTyping(true);

      await new Promise((r) => setTimeout(r, 600));

      const response = processMessage(text, expenses);

      if (response.startsWith("__ADD_EXPENSE__:")) {
        try {
          const data = JSON.parse(response.replace("__ADD_EXPENSE__:", ""));
          await addExpense({
            amount: data.amount,
            merchant: data.merchant,
            category: data.category as Category,
            date: new Date().toISOString(),
            isAIParsed: true,
          });
          const aiMsg = createMessage(
            "assistant",
            `Added ₹${data.amount} for "${data.merchant}" (${data.category}). It's in your expense list now!`
          );
          setMessages((prev) => [aiMsg, ...prev]);
        } catch {
          const aiMsg = createMessage(
            "assistant",
            "I had trouble adding that expense. Please try using the + button."
          );
          setMessages((prev) => [aiMsg, ...prev]);
        }
      } else {
        const aiMsg = createMessage("assistant", response);
        setMessages((prev) => [aiMsg, ...prev]);
      }
      setIsTyping(false);
    },
    [expenses, addExpense]
  );

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={[styles.avatarLg, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="cpu" size={22} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            AI Assistant
          </Text>
          <Text style={[styles.headerSub, { color: colors.accent }]}>
            Fully local · No cloud
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        inverted
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          isTyping ? (
            <View style={[styles.bubbleWrap]}>
              <View
                style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}
              >
                <Feather name="cpu" size={14} color={colors.primary} />
              </View>
              <View
                style={[
                  styles.bubble,
                  { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.typingText, { color: colors.mutedForeground }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.suggestions,
          { borderTopColor: colors.border },
        ]}
      >
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.chip,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
            onPress={() => send(s)}
          >
            <Text style={[styles.chipText, { color: colors.primary }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "web" ? insets.bottom + 34 : insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.foreground,
              borderColor: colors.border,
            },
          ]}
          placeholder="Ask about your expenses..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: input.trim() ? colors.primary : colors.border },
          ]}
          onPress={() => send(input)}
          disabled={!input.trim()}
          activeOpacity={0.8}
        >
          <Feather name="send" size={18} color={input.trim() ? "#fff" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  avatarLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  bubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  bubbleWrapUser: { justifyContent: "flex-end" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-end",
  },
  typingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
