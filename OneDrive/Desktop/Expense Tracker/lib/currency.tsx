import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const CURRENCY_KEY = 'expense_tracker_currency';

export const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs', label: 'Pakistani Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

type CurrencyContextValue = {
  currency: CurrencyCode;
  symbol: string;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  formatMoney: (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function getSymbol(code: CurrencyCode) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('PKR');

  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_KEY).then((value) => {
      if (value && CURRENCIES.some((c) => c.code === value)) {
        setCurrencyState(value as CurrencyCode);
      }
    });
  }, []);

  const setCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrencyState(code);
    await AsyncStorage.setItem(CURRENCY_KEY, code);
  }, []);

  const formatMoney = useCallback(
    (amount: number) => {
      const symbol = getSymbol(currency);
      const formatted = Number.isFinite(amount)
        ? amount.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })
        : '0';
      return `${symbol} ${formatted}`;
    },
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      symbol: getSymbol(currency),
      setCurrency,
      formatMoney,
    }),
    [currency, setCurrency, formatMoney]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return ctx;
}
