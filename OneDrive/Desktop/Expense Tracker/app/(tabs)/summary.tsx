import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { formatMonthLabel } from '@/components/AuthGate';
import { Card, EmptyState, ErrorText, LoadingView, Subtitle, Title } from '@/components/ui';
import { getCategoryColor } from '@/constants/Categories';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth';
import { useCurrency } from '@/lib/currency';
import {
  groupByCategory,
  groupByDay,
  listExpensesInRange,
  sumAmounts,
} from '@/lib/expenses';
import type { Expense } from '@/types/expense';

export default function SummaryScreen() {
  const colors = Colors[useColorScheme()];
  const { session } = useAuth();
  const { formatMoney } = useCurrency();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const start = format(startOfMonth(month), 'yyyy-MM-dd');
      const end = format(endOfMonth(month), 'yyyy-MM-dd');
      const data = await listExpensesInRange(start, end);
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, month]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const monthTotal = sumAmounts(expenses);
  const byCategory = groupByCategory(expenses);
  const byDay = groupByDay(expenses, month);

  const pieData = useMemo(
    () =>
      byCategory.map((item) => ({
        value: item.total,
        color: getCategoryColor(item.category),
        text: item.category,
      })),
    [byCategory]
  );

  const barData = useMemo(() => {
    // Show every ~3rd day label to keep the chart readable
    return byDay.map((item, index) => ({
      value: item.value,
      label: index % 3 === 0 ? item.label : '',
      frontColor: colors.primary,
      spacing: 6,
    }));
  }, [byDay, colors.primary]);

  const chartWidth = Dimensions.get('window').width - 72;

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
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
      <Title>Monthly summary</Title>
      <Subtitle>Charts for the selected month</Subtitle>

      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setMonth((current) => startOfMonth(subMonths(current, 1)))}
          style={[styles.monthBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.text }]}>{formatMonthLabel(month)}</Text>
        <Pressable
          onPress={() => setMonth((current) => startOfMonth(addMonths(current, 1)))}
          style={[styles.monthBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>›</Text>
        </Pressable>
      </View>

      <Card style={styles.totalCard}>
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Month total</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{formatMoney(monthTotal)}</Text>
      </Card>

      <ErrorText message={error} />

      {expenses.length === 0 ? (
        <EmptyState
          title="Nothing this month"
          body="Add expenses for this month to see category and daily charts."
        />
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>By category</Text>
          <Card>
            <View style={styles.pieWrap}>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                innerCircleColor={colors.card}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Total</Text>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                      {formatMoney(monthTotal)}
                    </Text>
                  </View>
                )}
              />
            </View>
            {byCategory.map((item) => (
              <View key={item.category} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: getCategoryColor(item.category) }]} />
                <Text style={[styles.legendLabel, { color: colors.text }]}>{item.category}</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{formatMoney(item.total)}</Text>
              </View>
            ))}
          </Card>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>By day</Text>
          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                barWidth={10}
                width={Math.max(chartWidth, byDay.length * 16)}
                height={180}
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={colors.border}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                hideRules={false}
                rulesColor={colors.border}
                isAnimated
              />
            </ScrollView>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 14,
  },
  monthBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalCard: {
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  pieWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 15,
  },
});
