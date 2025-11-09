export const SDK_CDN_URL =
  (process.env.NEXT_PUBLIC_RELAYER_SDK_URL as string | undefined) ??
  "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs";

export const EXPENSE_TAGS = [
  "Food & Dining",
  "Transportation",
  "Rent",
  "Shopping",
  "Entertainment",
  "Healthcare",
  "Education",
  "Others",
];

export const INCOME_TAGS = [
  "Salary",
  "Bonus",
  "Investment",
  "Others",
];

