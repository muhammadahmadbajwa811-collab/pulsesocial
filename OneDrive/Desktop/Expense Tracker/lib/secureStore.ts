import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;

async function setSecureItem(key: string, value: string) {
  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);

  if (chunkCount <= 1) {
    await SecureStore.setItemAsync(key, value);
    await SecureStore.deleteItemAsync(`${key}_chunks`).catch(() => undefined);
    return;
  }

  await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));
  for (let i = 0; i < chunkCount; i += 1) {
    const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}_${i}`, chunk);
  }
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
}

async function getSecureItem(key: string) {
  const chunkMeta = await SecureStore.getItemAsync(`${key}_chunks`);
  if (!chunkMeta) {
    return SecureStore.getItemAsync(key);
  }

  const chunkCount = Number(chunkMeta);
  let value = '';
  for (let i = 0; i < chunkCount; i += 1) {
    value += (await SecureStore.getItemAsync(`${key}_${i}`)) ?? '';
  }
  return value;
}

async function deleteSecureItem(key: string) {
  const chunkMeta = await SecureStore.getItemAsync(`${key}_chunks`);
  if (chunkMeta) {
    const chunkCount = Number(chunkMeta);
    for (let i = 0; i < chunkCount; i += 1) {
      await SecureStore.deleteItemAsync(`${key}_${i}`).catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(`${key}_chunks`).catch(() => undefined);
  }
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
}

export const largeSecureStore = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return getSecureItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return setSecureItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return deleteSecureItem(key);
  },
};
