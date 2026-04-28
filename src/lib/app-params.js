/**
 * App params para Supabase standalone
 * Suporta variáveis de ambiente via import.meta.env
 */
export const appParams = {
  appId: import.meta.env.VITE_APP_ID || 'standalone',
  token: null, // Não mais necessário com Supabase
  fromUrl: typeof window !== 'undefined' ? window.location.href : null,
  functionsVersion: null, // Não mais necessário com Supabase
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
};