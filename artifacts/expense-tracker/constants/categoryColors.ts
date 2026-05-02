import type { Category } from "@/context/ExpenseContext";

export const CATEGORY_COLORS: Record<Category, string> = {
  food: "#FF6B6B",
  transport: "#00BAC9",
  shopping: "#FFB400",
  entertainment: "#A855F7",
  utilities: "#3B82F6",
  health: "#10B981",
  education: "#F59E0B",
  travel: "#EC4899",
  other: "#9CA3AF",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  food: "coffee",
  transport: "navigation",
  shopping: "shopping-bag",
  entertainment: "film",
  utilities: "zap",
  health: "heart",
  education: "book",
  travel: "map-pin",
  other: "more-horizontal",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food & Dining",
  transport: "Transport",
  shopping: "Shopping",
  entertainment: "Entertainment",
  utilities: "Utilities",
  health: "Health",
  education: "Education",
  travel: "Travel",
  other: "Other",
};
