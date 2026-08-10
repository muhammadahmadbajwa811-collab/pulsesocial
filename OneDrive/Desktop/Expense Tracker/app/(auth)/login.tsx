import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorText, Field, Label, PrimaryButton, Subtitle, Title } from '@/components/ui';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const colors = Colors[useColorScheme()];
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <Text style={styles.brand}>Expense Tracker</Text>
            <Text style={styles.heroText}>Track daily spending. See your month clearly.</Text>
          </View>

          <View style={styles.form}>
            <Title>Welcome back</Title>
            <Subtitle>Log in to sync your expenses securely in the cloud.</Subtitle>

            {!configured ? (
              <View style={[styles.banner, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
                  Add your free Supabase URL and anon key to a `.env` file (see `.env.example`), then
                  restart Expo.
                </Text>
              </View>
            ) : null}

            <Label>Email</Label>
            <Field
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
            />

            <Label>Password</Label>
            <Field
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
            />

            <ErrorText message={error} />
            <PrimaryButton label="Log in" onPress={onSubmit} loading={loading} />

            <Text style={[styles.footer, { color: colors.textMuted }]}>
              New here?{' '}
              <Link href="/(auth)/signup" style={{ color: colors.primary, fontWeight: '700' }}>
                Create an account
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingBottom: 40 },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
  },
  brand: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 10,
    lineHeight: 22,
    maxWidth: 280,
  },
  form: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  footer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 15,
  },
});
