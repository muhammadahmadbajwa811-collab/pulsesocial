import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ExpenseListItem } from '@/components/ExpenseListItem';
import { Card, EmptyState, ErrorText, LoadingView, Subtitle, Title } from '@/components/ui';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth';
import { useCurrency } from '@/lib/currency';
import { getPeriodTotals, listExpenses } from '@/lib/expenses';
import type { Expense } from '@/types/expense';

export default function HomeScreen() {
  const colors = Colors[useColorScheme()];
  const router = useRouter();
  const { session } = useAuth();
  const { formatMoney } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const data = await listExpenses(80);
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const totals = getPeriodTotals(expenses);

  if (loading) {
    return <LoadingView />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }>
        <Title>Overview</Title>
        <Subtitle>Your spending at a glance</Subtitle>

        <View style={styles.totalsRow}>
          <Card style={[styles.totalCard, { borderColor: colors.primarySoft }]}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Today</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(totals.today)}</Text>
          </Card>
          <Card style={styles.totalCard}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>This week</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(totals.week)}</Text>
          </Card>
        </View>
        <Card style={styles.monthCard}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>This month</Text>
          <Text style={[styles.monthValue, { color: colors.primary }]}>{formatMoney(totals.month)}</Text>
        </Card>

        <ErrorText message={error} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
        </View>

        {expenses.length === 0 ? (
          <EmptyState
            title="No expenses yet"
            body="Tap + to add your first expense. It syncs securely to your account."
          />
        ) : (
          expenses.slice(0, 20).map((expense) => (
            <ExpenseListItem
              key={expense.id}
              expense={expense}
              onPress={() =>
                router.push({
                  pathname: '/expense-form',
                  params: { id: expense.id },
                })
              }
            />
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/expense-form')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}>
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  totalCard: {
    flex: 1,
  },
  monthCard: {
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  monthValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
