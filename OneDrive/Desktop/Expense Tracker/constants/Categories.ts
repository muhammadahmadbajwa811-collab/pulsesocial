import type { ExpenseCategory } from '@/types/expense';

export const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#E86A33',
  Transport: '#2F6FED',
  Bills: '#0EA5E9',
  Shopping: '#E23D73',
  Health: '#1FA971',
  Entertainment: '#D4A017',
  Other: '#6B7280',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category as ExpenseCategory] ?? CATEGORY_COLORS.Other;
}
