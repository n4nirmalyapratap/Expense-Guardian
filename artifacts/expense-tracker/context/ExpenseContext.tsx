import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Category =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "utilities"
  | "health"
  | "education"
  | "travel"
  | "other";

export interface Expense {
  id: string;
  amount: number;
  merchant: string;
  category: Category;
  date: string;
  rawText?: string;
  isAIParsed: boolean;
  note?: string;
}

interface ExpenseContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  addManyExpenses: (
    items: Omit<Expense, "id">[]
  ) => Promise<{ added: number; skipped: number }>;
  removeExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  getTotalByCategory: () => Record<Category, number>;
  getTotalByDay: (days?: number) => { date: string; total: number }[];
  getTotalThisMonth: () => number;
  getTotalThisWeek: () => number;
  isLoading: boolean;
  lastSmsScanDate: number | null;
  setLastSmsScanDate: (date: number) => Promise<void>;
  hasCompletedFirstScan: boolean;
  markFirstScanComplete: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | null>(null);

const STORAGE_KEY = "@expenses_v2";
const LAST_SCAN_KEY = "@last_sms_scan_v1";
const FIRST_SCAN_KEY = "@first_sms_scan_done_v1";

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function dedupeKey(e: Pick<Expense, "amount" | "merchant" | "date" | "rawText">): string {
  if (e.rawText) return "raw:" + e.rawText.replace(/\s+/g, " ").trim().slice(0, 200);
  return `${e.amount}|${e.merchant}|${e.date.slice(0, 16)}`;
}

const now = Date.now();
const day = 86400000;

const SAMPLE: Omit<Expense, "id">[] = [
  {
    amount: 450,
    merchant: "Swiggy",
    category: "food",
    date: new Date(now).toISOString(),
    isAIParsed: true,
    rawText: "INR 450.00 debited from A/c XX9821 at SWIGGY on 02-05-2026",
  },
  {
    amount: 250,
    merchant: "Uber",
    category: "transport",
    date: new Date(now - 2 * 3600000).toISOString(),
    isAIParsed: true,
    rawText: "Rs 250 debited for Uber ride on 02-05-2026",
  },
  {
    amount: 1200,
    merchant: "Amazon",
    category: "shopping",
    date: new Date(now - day).toISOString(),
    isAIParsed: true,
    rawText: "INR 1200 debited for Amazon.in order #408-123",
  },
  {
    amount: 199,
    merchant: "Netflix",
    category: "entertainment",
    date: new Date(now - day).toISOString(),
    isAIParsed: true,
    rawText: "Rs 199 charged by Netflix.com on 01-05-2026",
  },
  {
    amount: 80,
    merchant: "Starbucks",
    category: "food",
    date: new Date(now - 2 * day).toISOString(),
    isAIParsed: true,
    rawText: "INR 80 spent at STARBUCKS on 30-04-2026",
  },
  {
    amount: 3500,
    merchant: "Myntra",
    category: "shopping",
    date: new Date(now - 3 * day).toISOString(),
    isAIParsed: true,
    rawText: "Rs 3500 debited for Myntra order on 29-04-2026",
  },
  {
    amount: 150,
    merchant: "Metro Card",
    category: "transport",
    date: new Date(now - 3 * day).toISOString(),
    isAIParsed: true,
    rawText: "Delhi Metro card recharge Rs 150 on 29-04-2026",
  },
  {
    amount: 599,
    merchant: "Jio Recharge",
    category: "utilities",
    date: new Date(now - 4 * day).toISOString(),
    isAIParsed: true,
    rawText: "Jio prepaid recharge Rs 599 for 84 days on 28-04-2026",
  },
  {
    amount: 2800,
    merchant: "Apollo Pharmacy",
    category: "health",
    date: new Date(now - 5 * day).toISOString(),
    isAIParsed: true,
    rawText: "Rs 2800 at APOLLO PHARMACY on 27-04-2026",
  },
  {
    amount: 499,
    merchant: "Spotify",
    category: "entertainment",
    date: new Date(now - 5 * day).toISOString(),
    isAIParsed: true,
    rawText: "Spotify Premium Rs 499 auto-renew on 27-04-2026",
  },
  {
    amount: 320,
    merchant: "Zomato",
    category: "food",
    date: new Date(now - 6 * day).toISOString(),
    isAIParsed: true,
    rawText: "INR 320 at ZOMATO ORDER on 26-04-2026",
  },
  {
    amount: 1500,
    merchant: "BESCOM Electricity",
    category: "utilities",
    date: new Date(now - 7 * day).toISOString(),
    isAIParsed: true,
    rawText: "Electricity bill payment Rs 1500 to BESCOM on 25-04-2026",
  },
  {
    amount: 700,
    merchant: "Dominos Pizza",
    category: "food",
    date: new Date(now - 8 * day).toISOString(),
    isAIParsed: true,
    rawText: "Rs 700 at DOMINOS PIZZA on 24-04-2026",
  },
  {
    amount: 450,
    merchant: "BookMyShow",
    category: "entertainment",
    date: new Date(now - 10 * day).toISOString(),
    isAIParsed: true,
    rawText: "INR 450 BookMyShow ticket purchase on 22-04-2026",
  },
  {
    amount: 5999,
    merchant: "Flipkart",
    category: "shopping",
    date: new Date(now - 12 * day).toISOString(),
    isAIParsed: true,
    rawText: "Rs 5999 debited for Flipkart order OD987654 on 20-04-2026",
  },
  {
    amount: 350,
    merchant: "Ola Cab",
    category: "transport",
    date: new Date(now - 13 * day).toISOString(),
    isAIParsed: true,
    rawText: "Rs 350 debited for OLA ride on 19-04-2026",
  },
  {
    amount: 1200,
    merchant: "Udemy",
    category: "education",
    date: new Date(now - 14 * day).toISOString(),
    isAIParsed: true,
    rawText: "INR 1200 charged by UDEMY.COM on 18-04-2026",
  },
  {
    amount: 4200,
    merchant: "OYO Rooms",
    category: "travel",
    date: new Date(now - 15 * day).toISOString(),
    isAIParsed: true,
    rawText: "Rs 4200 debited for OYO booking on 17-04-2026",
  },
];

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSmsScanDate, setLastSmsScanDateState] = useState<number | null>(null);
  const [hasCompletedFirstScan, setHasCompletedFirstScan] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [stored, lastScan, firstScan] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LAST_SCAN_KEY),
          AsyncStorage.getItem(FIRST_SCAN_KEY),
        ]);
        if (stored) {
          setExpenses(JSON.parse(stored));
        } else {
          const sample = SAMPLE.map((e) => ({ ...e, id: makeId() }));
          setExpenses(sample);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
        }
        if (lastScan) setLastSmsScanDateState(parseInt(lastScan, 10));
        if (firstScan === "1") setHasCompletedFirstScan(true);
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const save = async (list: Expense[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const addExpense = async (expense: Omit<Expense, "id">) => {
    const e: Expense = { ...expense, id: makeId() };
    const updated = [e, ...expenses];
    setExpenses(updated);
    await save(updated);
  };

  const addManyExpenses = async (
    items: Omit<Expense, "id">[]
  ): Promise<{ added: number; skipped: number }> => {
    const existingKeys = new Set(expenses.map(dedupeKey));
    const fresh: Expense[] = [];
    let skipped = 0;
    for (const item of items) {
      const key = dedupeKey(item);
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      existingKeys.add(key);
      fresh.push({ ...item, id: makeId() });
    }
    if (fresh.length === 0) return { added: 0, skipped };
    const updated = [...fresh, ...expenses].sort((a, b) =>
      a.date < b.date ? 1 : -1
    );
    setExpenses(updated);
    await save(updated);
    return { added: fresh.length, skipped };
  };

  const setLastSmsScanDate = async (date: number) => {
    setLastSmsScanDateState(date);
    await AsyncStorage.setItem(LAST_SCAN_KEY, date.toString());
  };

  const markFirstScanComplete = async () => {
    setHasCompletedFirstScan(true);
    await AsyncStorage.setItem(FIRST_SCAN_KEY, "1");
  };

  const removeExpense = async (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    await save(updated);
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setExpenses(updated);
    await save(updated);
  };

  const getTotalByCategory = useCallback((): Record<Category, number> => {
    const totals: Record<Category, number> = {
      food: 0,
      transport: 0,
      shopping: 0,
      entertainment: 0,
      utilities: 0,
      health: 0,
      education: 0,
      travel: 0,
      other: 0,
    };
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [expenses]);

  const getTotalByDay = useCallback(
    (days = 7): { date: string; total: number }[] => {
      const result: { date: string; total: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * day);
        const dateStr = d.toISOString().split("T")[0];
        const total = expenses
          .filter((e) => e.date.startsWith(dateStr))
          .reduce((s, e) => s + e.amount, 0);
        result.push({ date: dateStr, total });
      }
      return result;
    },
    [expenses]
  );

  const getTotalThisMonth = useCallback((): number => {
    const n = new Date();
    const monthStart = new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
    return expenses
      .filter((e) => e.date >= monthStart)
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const getTotalThisWeek = useCallback((): number => {
    const weekStart = new Date(Date.now() - 7 * day).toISOString();
    return expenses
      .filter((e) => e.date >= weekStart)
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        addExpense,
        addManyExpenses,
        removeExpense,
        updateExpense,
        getTotalByCategory,
        getTotalByDay,
        getTotalThisMonth,
        getTotalThisWeek,
        isLoading,
        lastSmsScanDate,
        setLastSmsScanDate,
        hasCompletedFirstScan,
        markFirstScanComplete,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses(): ExpenseContextType {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpenseProvider");
  return ctx;
}
