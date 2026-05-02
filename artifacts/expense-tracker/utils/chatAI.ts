import type { Category, Expense } from "@/context/ExpenseContext";
import { CATEGORY_LABELS } from "@/constants/categoryColors";
import { categorizeExpense } from "./aiCategorizer";

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function getThisWeekExpenses(expenses: Expense[]): Expense[] {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  return expenses.filter((e) => e.date >= weekAgo);
}

function getThisMonthExpenses(expenses: Expense[]): Expense[] {
  const n = new Date();
  const monthStart = new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
  return expenses.filter((e) => e.date >= monthStart);
}

function getTodayExpenses(expenses: Expense[]): Expense[] {
  const today = new Date().toISOString().split("T")[0];
  return expenses.filter((e) => e.date.startsWith(today));
}

function topCategory(expenses: Expense[]): { cat: Category; total: number } | null {
  if (!expenses.length) return null;
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return { cat: sorted[0][0] as Category, total: sorted[0][1] };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

export function createMessage(role: "user" | "assistant", text: string): ChatMessage {
  return { id: makeId(), role, text, timestamp: new Date().toISOString() };
}

export function processMessage(text: string, expenses: Expense[]): string {
  const lower = text.toLowerCase().trim();

  if (
    /^(hi|hello|hey|good\s*(morning|evening|afternoon)|what'?s up)/i.test(lower)
  ) {
    return "Hello! I am your personal expense assistant. Ask me anything about your spending — like 'How much did I spend this week?' or 'What's my top category?'";
  }

  if (/help|what can you do|commands/i.test(lower)) {
    return "I can help you with:\n• Total spending (today / this week / this month)\n• Spending by category\n• Your biggest expense\n• Top spending categories\n• Add an expense (e.g. 'Add coffee 80')\n\nJust ask!";
  }

  if (/add\s+(.+)/i.test(lower)) {
    const match = lower.match(/add\s+(.+)/i);
    if (match) {
      const parts = match[1].trim();
      const amountMatch = parts.match(/(\d+(?:\.\d{1,2})?)/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1]);
        const desc = parts.replace(amountMatch[1], "").trim() || "expense";
        const category = categorizeExpense(desc) as Category;
        return `__ADD_EXPENSE__:${JSON.stringify({ amount, merchant: desc, category })}`;
      }
    }
    return "Please tell me the amount too — for example: 'Add coffee 80' or 'Add Amazon 1200'.";
  }

  if (/today/i.test(lower)) {
    const todayList = getTodayExpenses(expenses);
    const total = todayList.reduce((s, e) => s + e.amount, 0);
    if (!todayList.length)
      return "You haven't recorded any expenses today. Great start!";
    const top = topCategory(todayList);
    return `Today you spent ${fmt(total)} across ${todayList.length} transaction${todayList.length > 1 ? "s" : ""}. Your biggest spending area today: ${top ? CATEGORY_LABELS[top.cat] : "various"}.`;
  }

  if (/this week|week/i.test(lower) && !/month/i.test(lower)) {
    const list = getThisWeekExpenses(expenses);
    const total = list.reduce((s, e) => s + e.amount, 0);
    if (!list.length) return "No expenses found for this week yet.";
    const top = topCategory(list);
    return `This week you spent ${fmt(total)} across ${list.length} transactions. Top category: ${top ? `${CATEGORY_LABELS[top.cat]} (${fmt(top.total)})` : "N/A"}.`;
  }

  if (/this month|month/i.test(lower)) {
    const list = getThisMonthExpenses(expenses);
    const total = list.reduce((s, e) => s + e.amount, 0);
    if (!list.length) return "No expenses recorded this month yet.";
    const top = topCategory(list);
    return `This month you have spent ${fmt(total)} across ${list.length} transactions. Your top spending category is ${top ? `${CATEGORY_LABELS[top.cat]} at ${fmt(top.total)}` : "N/A"}.`;
  }

  if (/total|overall|all time/i.test(lower)) {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return `Your total recorded spending is ${fmt(total)} across ${expenses.length} transactions.`;
  }

  if (/biggest|largest|most expensive|highest/i.test(lower)) {
    if (!expenses.length) return "No expenses recorded yet.";
    const max = [...expenses].sort((a, b) => b.amount - a.amount)[0];
    return `Your biggest expense is ${fmt(max.amount)} at ${max.merchant} (${CATEGORY_LABELS[max.category]}) on ${new Date(max.date).toLocaleDateString("en-IN")}.`;
  }

  if (/top categor|spending categor|where.*spend|what.*category/i.test(lower)) {
    if (!expenses.length) return "No expenses yet to analyze.";
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const lines = sorted
      .map(
        ([cat, val], i) =>
          `${i + 1}. ${CATEGORY_LABELS[cat as Category]} — ${fmt(val)}`
      )
      .join("\n");
    return `Your top spending categories:\n${lines}`;
  }

  const catMatch = Object.keys(CATEGORY_LABELS).find((c) =>
    lower.includes(c)
  ) as Category | undefined;
  if (catMatch) {
    const list = expenses.filter((e) => e.category === catMatch);
    const total = list.reduce((s, e) => s + e.amount, 0);
    if (!list.length)
      return `No expenses found in ${CATEGORY_LABELS[catMatch]} category.`;
    return `You have spent ${fmt(total)} on ${CATEGORY_LABELS[catMatch]} across ${list.length} transaction${list.length > 1 ? "s" : ""}.`;
  }

  if (/how many|count|number of/i.test(lower)) {
    return `You have ${expenses.length} total expense records.`;
  }

  if (/average|avg|per day/i.test(lower)) {
    if (!expenses.length) return "No expenses recorded yet.";
    const oldest = expenses.reduce((min, e) =>
      e.date < min.date ? e : min
    );
    const daysDiff = Math.max(
      1,
      Math.ceil(
        (Date.now() - new Date(oldest.date).getTime()) / 86400000
      )
    );
    const avg = expenses.reduce((s, e) => s + e.amount, 0) / daysDiff;
    return `Your average daily spending is ${fmt(Math.round(avg))} based on your expense history.`;
  }

  if (/recent|last|latest/i.test(lower)) {
    const recent = expenses.slice(0, 3);
    if (!recent.length) return "No recent expenses found.";
    const lines = recent
      .map(
        (e) =>
          `• ${fmt(e.amount)} at ${e.merchant} (${new Date(e.date).toLocaleDateString("en-IN")})`
      )
      .join("\n");
    return `Your 3 most recent expenses:\n${lines}`;
  }

  return "I didn't quite get that. Try asking: 'How much this week?', 'Top categories', 'Biggest expense', or 'Add [item] [amount]'.";
}
