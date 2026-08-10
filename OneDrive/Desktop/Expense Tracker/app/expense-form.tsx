import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CategoryPicker } from '@/components/CategoryPicker';
import {
  ErrorText,
  Field,
  Label,
  LoadingView,
  PrimaryButton,
} from '@/components/ui';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth';
import {
  createExpense,
  deleteExpense,
  getExpense,
  toDateInputValue,
  updateExpense,
  validateExpenseInput,
} from '@/lib/expenses';

export default function ExpenseFormScreen() {
  const colors = Colors[useColorScheme()];
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : undefined;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [spentAt, setSpentAt] = useState(toDateInputValue(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    let active = true;
    (async () => {
      try {
        const expense = await getExpense(editingId);
        if (!active) return;
        if (!expense) {
          setError('Expense not found.');
          setLoading(false);
          return;
        }
        setAmount(String(expense.amount));
        setCategory(expense.category);
        setNote(expense.note ?? '');
        setSpentAt(expense.spent_at);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load expense');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [editingId]);

  function onDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (date) {
      setSpentAt(toDateInputValue(date));
    }
  }

  async function onSave() {
    setError(null);
    const validationError = validateExpenseInput({ amount, category, spent_at: spentAt });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!user) {
      setError('You must be logged in.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: Number(amount),
        category,
        note,
        spent_at: spentAt,
      };
      if (editingId) {
        await updateExpense(editingId, payload);
      } else {
        await createExpense(user.id, payload);
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  function onDelete() {
    if (!editingId) return;
    Alert.alert('Delete expense', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteExpense(editingId);
            router.back();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingView />;
  }

  return (
    <>
      <Stack.Screen options={{ title: editingId ? 'Edit expense' : 'Add expense' }} />
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Label>Amount</Label>
          <Field
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <Label>Category</Label>
          <CategoryPicker value={category} onChange={setCategory} />

          <Label>Date</Label>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[
              styles.dateBtn,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}>
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {format(parseISO(spentAt), 'MMM d, yyyy')}
            </Text>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
              value={parseISO(spentAt)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          ) : null}
          {Platform.OS === 'ios' && showPicker ? (
            <PrimaryButton label="Done" variant="ghost" onPress={() => setShowPicker(false)} />
          ) : null}

          <Label>Note (optional)</Label>
          <Field
            value={note}
            onChangeText={setNote}
            placeholder="e.g. groceries, fuel"
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <ErrorText message={error} />
          <PrimaryButton
            label={editingId ? 'Save changes' : 'Add expense'}
            onPress={onSave}
            loading={saving}
          />

          {editingId ? (
            <View style={styles.deleteWrap}>
              <PrimaryButton
                label="Delete"
                variant="danger"
                onPress={onDelete}
                loading={deleting}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  dateBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  deleteWrap: {
    marginTop: 12,
  },
});
