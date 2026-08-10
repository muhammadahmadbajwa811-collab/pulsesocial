import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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

export default function SignupScreen() {
  const colors = Colors[useColorScheme()];
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    Alert.alert(
      'Account created',
      'If email confirmation is enabled in Supabase, check your inbox. Otherwise you can log in now.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Title>Create account</Title>
          <Subtitle>Free cloud sync with secure per-user data isolation.</Subtitle>

          <View style={styles.form}>
            <Label>Email</Label>
            <Field
              autoCapitalize="none"
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
              placeholder="At least 6 characters"
            />

            <Label>Confirm password</Label>
            <Field
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
            />

            <ErrorText message={error} />
            <PrimaryButton label="Sign up" onPress={onSubmit} loading={loading} />

            <Text style={[styles.footer, { color: colors.textMuted }]}>
              Already have an account?{' '}
              <Link href="/(auth)/login" style={{ color: colors.primary, fontWeight: '700' }}>
                Log in
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
  content: { padding: 24, paddingTop: 40 },
  form: { marginTop: 24 },
  footer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 15,
  },
});
