import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

/**
 * Supabase 客户端
 * - persistSession + localStorage：登录态持久化，关闭浏览器后仍保持约 30 天
 * - autoRefreshToken：access token 过期时自动用 refresh token 续期
 */
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);