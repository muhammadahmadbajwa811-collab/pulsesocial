import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, Subtitle, Title } from '@/components/ui';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth';
import { CURRENCIES, useCurrency, type CurrencyCode } from '@/lib/currency';

export default function SettingsScreen() {
  const colors = Colors[useColorScheme()];
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await signOut();
          setLoggingOut(false);
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Title>Settings</Title>
      <Subtitle>Account and display preferences</Subtitle>

      <Card style={styles.card}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Signed in as</Text>
        <Text style={[styles.value, { color: colors.text }]}>{user?.email ?? '—'}</Text>
      </Card>

      <Text style={[styles.section, { color: colors.text }]}>Currency</Text>
      <Card>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Display only — amounts are stored as numbers, not converted between currencies.
        </Text>
        <View style={styles.currencyWrap}>
          {CURRENCIES.map((item) => {
            const selected = currency === item.code;
            return (
              <Pressable
                key={item.code}
                onPress={() => setCurrency(item.code as CurrencyCode)}
                style={[
                  styles.currencyChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.background,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}>
                <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '700' }}>
                  {item.code}
                </Text>
                <Text style={{ color: selected ? '#fff' : colors.textMuted, fontSize: 12 }}>
                  {item.symbol}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={styles.logout}>
        <PrimaryButton
          label="Log out"
          variant="danger"
          onPress={onLogout}
          loading={loggingOut}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginTop: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  currencyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
    gap: 2,
  },
  logout: {
    marginTop: 28,
  },
});
