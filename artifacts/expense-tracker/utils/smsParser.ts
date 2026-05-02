import { categorizeExpense } from "./aiCategorizer";
import type { Category } from "@/context/ExpenseContext";

export interface ParsedExpense {
  amount: number;
  merchant: string;
  category: Category;
  date: string;
  rawText: string;
  confidence: number;
}

const AMOUNT_PATTERNS = [
  /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
  /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/gi,
  /debited.*?(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
  /(?:amount|paid|payment)[^\d]*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
];

const MERCHANT_PATTERNS = [
  /(?:at|to|@)\s+([A-Za-z0-9\s&'.:-]{3,40})(?:\s+on|\s+for|\s+via|\s*[,.]|$)/i,
  /(?:for|via)\s+([A-Za-z0-9\s&'.:-]{3,40})(?:\s+on|\s+at|\s*[,.]|$)/i,
];

function extractAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.[1]) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  const plain = text.match(/\b(\d{2,6}(?:\.\d{1,2})?)\b/);
  if (plain) {
    const n = parseFloat(plain[1]);
    if (n > 0) return n;
  }
  return null;
}

function extractMerchant(text: string): string {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ").slice(0, 40);
    }
  }
  const words = text
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !/\d/.test(w))
    .slice(0, 2);
  return words.join(" ") || "Unknown";
}

export function parseSMS(text: string): ParsedExpense | null {
  const lower = text.toLowerCase();

  const isExpenseRelated =
    /debit|spent|paid|payment|purchase|charged|transfer|recharge|bill|order/i.test(
      text
    );
  if (!isExpenseRelated) return null;

  const amount = extractAmount(text);
  if (!amount) return null;

  const merchant = extractMerchant(text);
  const category = categorizeExpense(text) as Category;
  const confidence =
    merchant !== "Unknown" ? 0.9 : 0.6;

  return {
    amount,
    merchant,
    category,
    date: new Date().toISOString(),
    rawText: text,
    confidence,
  };
}

export const SAMPLE_SMS_MESSAGES = [
  "Dear customer, INR 450.00 debited from your A/c XX9821 at SWIGGY on 02-05-2026. Available Bal: INR 24,350.",
  "Rs 250 debited for Uber ride. Your A/c XX1234 balance is Rs 18,100.",
  "Your HDFC Bank account XX5678 has been debited with INR 1,199 towards Netflix on 01-05-2026.",
  "INR 3500 spent at MYNTRA ORDER via UPI on 29-04-2026. Avl bal: Rs 15,600.",
  "Rs 599 debited for JIO prepaid recharge (84 days). Ref no: JIO98765.",
  "Payment of Rs 2800 to APOLLO PHARMACY confirmed. UPI ref: APO12345.",
  "INR 700 debited for DOMINOS PIZZA order. Remaining balance: Rs 12,450.",
  "Rs 1500 paid to BESCOM electricity bill. Transaction successful.",
  "Your card XX9012 charged INR 499 by SPOTIFY.COM on 27-04-2026.",
  "Transfer of Rs 350 to OLA CABS successful. Balance: Rs 8,200.",
];
