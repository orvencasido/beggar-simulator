import Storage from 'expo-sqlite/kv-store';

export const gameStorage = {
  get: (key: string) => Storage.getItem(key),
  set: (key: string, value: string) => Storage.setItem(key, value),
  remove: (key: string) => Storage.removeItem(key),
};
