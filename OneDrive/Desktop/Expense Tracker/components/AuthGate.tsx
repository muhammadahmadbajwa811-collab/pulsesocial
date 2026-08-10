import { format, parseISO } from 'date-fns';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

import { LoadingView } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!configured) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router, configured]);

  if (loading) {
    return <LoadingView />;
  }

  return <>{children}</>;
}

export function formatMonthLabel(value: string | Date) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'MMMM yyyy');
}
