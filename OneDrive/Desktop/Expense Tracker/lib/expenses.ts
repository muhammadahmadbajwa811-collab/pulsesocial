import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { supabase } from '@/lib/supabase';
import type { Expense, ExpenseInsert, ExpenseUpdate } from '@/types/expense';

function mapExpense(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    amount: Number(row.amount),
    category: String(row.category),
    note: row.note == null ? null : String(row.note),
    spent_at: String(row.spent_at),
    created_at: String(row.created_at),
  };
}

export async function listExpenses(limit = 100): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('spent_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapExpense);
}

export async function listExpensesInRange(startDate: string, endDate: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('spent_at', startDate)
    .lte('spent_at', endDate)
    .order('spent_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapExpense);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const { data, error } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapExpense(data) : null;
}

export async function createExpense(userId: string, input: ExpenseInsert): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      amount: input.amount,
      category: input.category,
      note: input.note?.trim() || null,
      spent_at: input.spent_at,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapExpense(data);
}

export async function updateExpense(id: string, input: ExpenseUpdate): Promise<Expense> {
  const payload: Record<string, unknown> = {};
  if (input.amount != null) payload.amount = input.amount;
  if (input.category != null) payload.category = input.category;
  if (input.note !== undefined) payload.note = input.note?.trim() || null;
  if (input.spent_at != null) payload.spent_at = input.spent_at;

  const { data, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapExpense(data);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function sumAmounts(expenses: Expense[]): number {
  return expenses.reduce((total, item) => total + Number(item.amount), 0);
}

export function filterByRange(expenses: Expense[], start: Date, end: Date): Expense[] {
  const startKey = format(start, 'yyyy-MM-dd');
  const endKey = format(end, 'yyyy-MM-dd');
  return expenses.filter((item) => item.spent_at >= startKey && item.spent_at <= endKey);
}

export function getPeriodTotals(expenses: Expense[], now = new Date()) {
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const today = filterByRange(expenses, todayStart, todayStart);
  const week = filterByRange(expenses, weekStart, weekEnd);
  const month = filterByRange(expenses, monthStart, monthEnd);

  return {
    today: sumAmounts(today),
    week: sumAmounts(week),
    month: sumAmounts(month),
  };
}

export function groupByCategory(expenses: Expense[]): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const item of expenses) {
    map.set(item.category, (map.get(item.category) ?? 0) + Number(item.amount));
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function groupByDay(
  expenses: Expense[],
  monthDate: Date
): { label: string; value: number; date: string }[] {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const daysInMonth = end.getDate();
  const totals = new Map<string, number>();

  for (const item of expenses) {
    totals.set(item.spent_at, (totals.get(item.spent_at) ?? 0) + Number(item.amount));
  }

  const points: { label: string; value: number; date: string }[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), day);
    const key = format(date, 'yyyy-MM-dd');
    points.push({
      label: String(day),
      value: totals.get(key) ?? 0,
      date: key,
    });
  }
  return points;
}

export function toDateInputValue(date: Date | string): string {
  if (typeof date === 'string') {
    return format(parseISO(date), 'yyyy-MM-dd');
  }
  return format(date, 'yyyy-MM-dd');
}

export function validateExpenseInput(input: {
  amount: string;
  category: string;
  spent_at: string;
}): string | null {
  const amount = Number(input.amount);
  if (!input.amount.trim() || Number.isNaN(amount) || amount <= 0) {
    return 'Enter a valid amount greater than 0.';
  }
  if (!input.category.trim()) {
    return 'Choose a category.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.spent_at)) {
    return 'Pick a valid date.';
  }
  return null;
}
