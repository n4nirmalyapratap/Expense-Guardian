import { Platform, PermissionsAndroid } from "react-native";

import { parseSMS, type ParsedExpense } from "./smsParser";

export interface RawSMS {
  _id: number;
  address: string;
  body: string;
  date: number;
  date_sent: number;
}

const BANK_SENDER_PATTERNS = [
  /HDFC/i,
  /ICICI/i,
  /SBI/i,
  /AXIS/i,
  /KOTAK/i,
  /YES.*BNK/i,
  /YESBNK/i,
  /IDFC/i,
  /BOB/i,
  /PNB/i,
  /CANARA/i,
  /UNION/i,
  /BOI/i,
  /CITI/i,
  /HSBC/i,
  /SCB/i,
  /AMEX/i,
  /RBL/i,
  /PAYTM/i,
  /PHONEPE/i,
  /GPAY/i,
  /BHIM/i,
  /UPI/i,
  /BANK/i,
  /-BK$/i,
  /BNK/i,
];

function isBankSender(address: string): boolean {
  if (!address) return false;
  return BANK_SENDER_PATTERNS.some((pat) => pat.test(address));
}

let SmsAndroid: any = null;
async function getSmsModule() {
  if (Platform.OS !== "android") return null;
  if (!SmsAndroid) {
    try {
      SmsAndroid = (await import("react-native-get-sms-android")).default;
    } catch {
      return null;
    }
  }
  return SmsAndroid;
}

export function isSmsReadingSupported(): boolean {
  return Platform.OS === "android";
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: "SMS Access",
        message:
          "Expense Tracker needs to read your SMS to automatically detect bank transactions and add them as expenses. Your messages stay on your device — nothing is sent anywhere.",
        buttonPositive: "Allow",
        buttonNegative: "Not Now",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function checkSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
  } catch {
    return false;
  }
}

export async function fetchSMSList(opts: {
  minDate?: number;
  maxCount?: number;
}): Promise<RawSMS[]> {
  const Sms = await getSmsModule();
  if (!Sms) return [];

  const filter: Record<string, unknown> = {
    box: "inbox",
    maxCount: opts.maxCount ?? 5000,
  };
  if (opts.minDate) filter.minDate = opts.minDate;

  return new Promise<RawSMS[]>((resolve) => {
    try {
      Sms.list(
        JSON.stringify(filter),
        () => resolve([]),
        (_count: number, smsList: string) => {
          try {
            const arr = JSON.parse(smsList) as RawSMS[];
            resolve(Array.isArray(arr) ? arr : []);
          } catch {
            resolve([]);
          }
        }
      );
    } catch {
      resolve([]);
    }
  });
}

export interface ScannedExpense extends ParsedExpense {
  smsId: number;
  smsDate: number;
  sender: string;
}

export async function scanSMSForExpenses(opts: {
  minDate?: number;
  maxCount?: number;
  bankSendersOnly?: boolean;
}): Promise<ScannedExpense[]> {
  const messages = await fetchSMSList({
    minDate: opts.minDate,
    maxCount: opts.maxCount ?? 5000,
  });

  const results: ScannedExpense[] = [];
  for (const msg of messages) {
    if (opts.bankSendersOnly !== false && !isBankSender(msg.address)) continue;
    const parsed = parseSMS(msg.body);
    if (!parsed) continue;
    results.push({
      ...parsed,
      smsId: msg._id,
      smsDate: msg.date,
      sender: msg.address,
      date: new Date(msg.date).toISOString(),
    });
  }
  return results;
}
