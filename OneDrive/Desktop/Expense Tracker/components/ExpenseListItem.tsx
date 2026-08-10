import { format, parseISO } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategoryColor } from '@/constants/Categories';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useCurrency } from '@/lib/currency';
import type { Expense } from '@/types/expense';

export function ExpenseListItem({
  expense,
  onPress,
}: {
  expense: Expense;
  onPress: () => void;
}) {
  const colors = Colors[useColorScheme()];
  const { formatMoney } = useCurrency();
  const accent = getCategoryColor(expense.category);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <View style={styles.meta}>
        <Text style={[styles.category, { color: colors.text }]}>{expense.category}</Text>
        <Text style={[styles.note, { color: colors.textMuted }]} numberOfLines={1}>
          {expense.note?.trim() || format(parseISO(expense.spent_at), 'MMM d, yyyy')}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.text }]}>{formatMoney(expense.amount)}</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {format(parseISO(expense.spent_at), 'MMM d')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  meta: {
    flex: 1,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
});
