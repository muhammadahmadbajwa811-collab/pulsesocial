export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Bills'
  | 'Shopping'
  | 'Health'
  | 'Entertainment'
  | 'Other';

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory | string;
  note: string | null;
  spent_at: string;
  created_at: string;
};

export type ExpenseInsert = {
  amount: number;
  category: string;
  note?: string | null;
  spent_at: string;
};

export type ExpenseUpdate = Partial<ExpenseInsert>;
