import { supabase } from './supabase.js';

const TABLE = 'kv_store_02fd4b7a';

export const kv = {
  async get(key) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? undefined;
  },

  async set(key, value) {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value });
    if (error) throw error;
  },

  async del(key) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('key', key);
    if (error) throw error;
  },

  async mget(keys) {
    if (keys.length === 0) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .in('key', keys);
    if (error) throw error;
    return data?.map((d) => d.value) ?? [];
  },

  async mset(keys, values) {
    const { error } = await supabase
      .from(TABLE)
      .upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
    if (error) throw error;
  },

  async mdel(keys) {
    if (keys.length === 0) return;
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .in('key', keys);
    if (error) throw error;
  },

  async getByPrefix(prefix) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('key, value')
      .like('key', `${prefix}%`);
    if (error) throw error;
    return data?.map((d) => d.value) ?? [];
  },
};
