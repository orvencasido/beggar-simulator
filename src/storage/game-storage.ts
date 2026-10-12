// The web implementation also supports static rendering without a browser.
export const gameStorage = {
  async get(key: string): Promise<string | null> {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};
